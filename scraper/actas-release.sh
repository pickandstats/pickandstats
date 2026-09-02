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
# 'restaurar' imprime una linea inequivoca: ACTAS: CACHE | RELEASE | FEB.
set -uo pipefail

TAG="actas-cache"
CATS="primerafeb segundafeb tercerafeb"
ESTADO="data/processed/estado.json"

temporada_de() { node -p "((require('./$ESTADO').competiciones||{})['$1']||{}).temporada||''" 2>/dev/null; }
contar() { if [ -d "$1" ]; then find "$1" -maxdepth 1 -name '*.json' | wc -l | tr -d ' '; else echo 0; fi; }

restaurar() {
  local forzar=0
  [ "${1:-}" = "--forzar" ] && forzar=1
  local overall="CACHE"   # peor caso encontrado: FEB > RELEASE > CACHE

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

    # No hay actas en disco (o se fuerza): intentar restaurar del release.
    local tmp err rc
    tmp=$(mktemp -d)
    err=$(gh release download "$TAG" -p "actas-$cat-$T.tar.gz" -D "$tmp" --clobber 2>&1); rc=$?
    if [ "$rc" -eq 0 ]; then
      mkdir -p "data/raw/$cat/$T"
      tar -xzf "$tmp/actas-$cat-$T.tar.gz" -C "data/raw/$cat/$T"
      local m; m=$(contar "$dir")
      echo "  $cat $T: restauradas $m actas desde RELEASE"
      [ "$overall" != "FEB" ] && overall="RELEASE"
    elif echo "$err" | grep -qiE 'release not found|no assets|not find|no artifact|404'; then
      # Ausencia esperada: al arrancar una temporada todavia no hay tarball suyo.
      echo "  $cat $T: todavia no hay respaldo de esta temporada (normal al arrancar); se re-extraeran desde la FEB"
      overall="FEB"
    else
      # Fallo real (red, permisos, asset corrupto): esto si merece ruido.
      echo "  $cat $T: ⚠ el release no responde o esta corrupto -> $err"
      overall="FEB"
    fi
    rm -rf "$tmp"
  done

  echo "ACTAS: $overall"
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

    tar -czf "actas-$cat-$T.tar.gz" -C "data/raw/$cat/$T" actas
    if gh release upload "$TAG" "actas-$cat-$T.tar.gz" --clobber; then
      echo "  $cat $T: subidas $n actas al release"
    else
      echo "  $cat $T: ⚠ no se pudo subir el respaldo al release"
    fi
    rm -f "actas-$cat-$T.tar.gz"
  done
}

case "${1:-}" in
  restaurar) shift; restaurar "${1:-}";;
  publicar)  publicar;;
  *) echo "Uso: $0 restaurar [--forzar] | publicar" >&2; exit 2;;
esac
