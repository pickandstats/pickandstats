#!/usr/bin/env bash
# Respaldo persistente de las actas por cuartos como release assets de GitHub
# (ARQUITECTURA.md §17.4). Las actas son ~100 MB gitignored que solo viven en la
# cache de Actions, que caduca a los 7 dias; un release asset no caduca y es el
# respaldo del que restaurar cuando la cache no esta.
#
# Un tar.gz por categoria y temporada (actas-<cat>-<temp>.tar.gz), en un release
# dedicado (tag "actas-cache"). Se opera solo sobre la temporada SELECCIONADA de
# cada categoria (la que se scrapea); las cerradas se respaldan una vez y no se
# vuelven a mover.
#
# Requiere: gh (presente en los runners de Actions) y GH_TOKEN en el entorno.
# Uso:
#   bash scraper/actas-release.sh restaurar [--forzar]   # cache -> release -> (FEB)
#   bash scraper/actas-release.sh publicar               # sube la temporada en curso
#
# 'restaurar' imprime una linea inequivoca:
#   ACTAS: CACHE
#   ACTAS: RELEASE
#   ACTAS: FEB (temporada nueva, normal)     <- ausencia esperada, NO caido al lento
#   ACTAS: FEB (respaldo ausente o roto)     <- esto si merece atencion
set -uo pipefail

TAG="actas-cache"
CATS="primerafeb segundafeb tercerafeb"
ESTADO="data/processed/estado.json"

temporada_de() { node -p "((require('./$ESTADO').competiciones||{})['$1']||{}).temporada||''" 2>/dev/null; }
contar() { if [ -d "$1" ]; then find "$1" -maxdepth 1 -name '*.json' | wc -l | tr -d ' '; else echo 0; fi; }

# Lista de assets del release, cacheada y consultada una sola vez. release_rc=0
# si el release existe (aunque este vacio), !=0 si no existe o gh/red fallan. No
# se clasifica por el TEXTO del mensaje de gh (depende de idioma/wording): se
# decide con la existencia comprobable del release y del asset concreto.
release_assets=""; release_rc=1; release_fetched=0
ensure_release_list() {
  [ "$release_fetched" = "1" ] && return
  release_assets=$(gh release view "$TAG" --json assets --jq '.assets[].name' 2>/dev/null)
  release_rc=$?
  release_fetched=1
}

restaurar() {
  local forzar=0
  [ "${1:-}" = "--forzar" ] && forzar=1
  # Estado global: 0=CACHE 1=RELEASE 2=FEB(normal) 3=FEB(atencion). Se queda con el peor.
  local rank=0

  for cat in $CATS; do
    local T dir n
    T=$(temporada_de "$cat")
    [ -z "$T" ] && { echo "  $cat: sin temporada en estado.json, se omite"; continue; }
    dir="data/raw/$cat/$T/actas"
    n=$(contar "$dir")

    if [ "$forzar" = "0" ] && [ "$n" -gt 0 ]; then
      echo "  $cat $T: $n actas en disco (CACHE)"
      continue
    fi

    # Hacen falta actas (o se fuerza). Decidir con la existencia del release/asset.
    ensure_release_list
    local asset="actas-$cat-$T.tar.gz"
    if [ "$release_rc" -ne 0 ]; then
      echo "  $cat $T: ⚠ el release '$TAG' no existe o no responde; se re-extraeran desde la FEB"
      [ "$rank" -lt 3 ] && rank=3
    elif ! printf '%s\n' "$release_assets" | grep -qx "$asset"; then
      echo "  $cat $T: todavia no hay respaldo de esta temporada (normal al arrancar); se re-extraeran desde la FEB"
      [ "$rank" -lt 2 ] && rank=2
    else
      local tmp; tmp=$(mktemp -d)
      if gh release download "$TAG" -p "$asset" -D "$tmp" --clobber 2>/dev/null && \
         mkdir -p "data/raw/$cat/$T" && tar -xzf "$tmp/$asset" -C "data/raw/$cat/$T" 2>/dev/null; then
        local m; m=$(contar "$dir")
        echo "  $cat $T: restauradas $m actas desde RELEASE"
        [ "$rank" -lt 1 ] && rank=1
      else
        echo "  $cat $T: ⚠ el asset existe pero no se pudo descargar/extraer (¿corrupto?); se re-extraeran desde la FEB"
        [ "$rank" -lt 3 ] && rank=3
      fi
      rm -rf "$tmp"
    fi
  done

  case "$rank" in
    0) echo "ACTAS: CACHE";;
    1) echo "ACTAS: RELEASE";;
    2) echo "ACTAS: FEB (temporada nueva, normal)";;
    3) echo "ACTAS: FEB (respaldo ausente o roto)";;
  esac
}

publicar() {
  for cat in $CATS; do
    local T dir n
    T=$(temporada_de "$cat")
    [ -z "$T" ] && continue
    dir="data/raw/$cat/$T/actas"
    n=$(contar "$dir")
    [ "$n" -gt 0 ] || { echo "  $cat $T: sin actas en disco, no se sube"; continue; }

    # Crear el release de respaldo si aun no existe (bootstrap en la 1a ejecucion).
    if ! gh release view "$TAG" >/dev/null 2>&1; then
      gh release create "$TAG" --prerelease \
        --title "Respaldo de actas por cuartos (cache)" \
        --notes "Respaldo persistente de data/raw/*/*/actas (gitignored). NO es un release de software: un tar.gz por categoria y temporada, del que restaura el workflow cuando la cache de Actions caduca. Ver ARQUITECTURA.md §17.4."
      echo "  release '$TAG' creado (bootstrap)"
    fi

    # El tar.gz va a un directorio temporal, no a la raiz del repo: si la subida
    # falla o el job se cancela, no deja 73 MB colgando en el arbol de trabajo.
    local tmp; tmp=$(mktemp -d)
    tar -czf "$tmp/actas-$cat-$T.tar.gz" -C "data/raw/$cat/$T" actas
    if gh release upload "$TAG" "$tmp/actas-$cat-$T.tar.gz" --clobber; then
      echo "  $cat $T: subidas $n actas al release"
    else
      echo "  $cat $T: ⚠ no se pudo subir el respaldo al release"
    fi
    rm -rf "$tmp"
  done
}

case "${1:-}" in
  restaurar) shift; restaurar "${1:-}";;
  publicar)  publicar;;
  *) echo "Uso: $0 restaurar [--forzar] | publicar" >&2; exit 2;;
esac
