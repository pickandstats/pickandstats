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
  # El respaldo "ausente o roto" ya NO sale con 0 (lote 33, 1.2): antes la
  # funcion acababa en el `echo` del `case` y el paso salia en verde diciendo,
  # solo en el log, que iba a re-extraer toda la temporada de la FEB (horas).
  # Salir distinto de 0 aqui no retiene nada: el paso es continue-on-error y el
  # resumen de salud lee su `outcome` (steps.<id>.outcome, que sigue siendo
  # `failure` aunque la `conclusion` sea `success`) y lo convierte en critico.
  [ "$rank" -lt 3 ]
}

publicar() {
  local fallos=0
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
        --notes "Respaldo persistente de data/raw/*/*/actas (gitignored). NO es un release de software: un tar.gz por categoria y temporada, del que restaura el workflow cuando la cache de Actions caduca. Ver ARQUITECTURA.md §17.4." \
        || { echo "  $cat $T: ⚠ no se pudo crear el release de respaldo"; fallos=$((fallos+1)); continue; }
      echo "  release '$TAG' creado (bootstrap)"
    fi

    # El tar.gz va a un directorio temporal, no a la raiz del repo: si la subida
    # falla o el job se cancela, no deja 73 MB colgando en el arbol de trabajo.
    local tmp asset tar_local; tmp=$(mktemp -d)
    asset="actas-$cat-$T.tar.gz"; tar_local="$tmp/$asset"
    tar -czf "$tar_local" -C "data/raw/$cat/$T" actas

    # Un respaldo tiene que decir cuando no respalda (lote 33, 1.2). Cuatro
    # comprobaciones, y cualquiera que falle hace que el paso salga con 1:
    #  1) el tar lleva TODAS las actas que hay en disco;
    #  2) la subida no dio error;
    #  3) el asset que ve el release tiene EXACTAMENTE el tamano del tar subido;
    #  4) y se ha actualizado hace menos de 15 minutos (no es uno viejo que la
    #     subida no llego a reemplazar).
    local en_tar; en_tar=$(tar -tzf "$tar_local" | grep -c '\.json$')
    if [ "$en_tar" != "$n" ]; then
      echo "  $cat $T: ⚠ el tar lleva $en_tar actas y hay $n en disco; no se sube"
      fallos=$((fallos+1)); rm -rf "$tmp"; continue
    fi
    if ! gh release upload "$TAG" "$tar_local" --clobber; then
      echo "  $cat $T: ⚠ no se pudo subir el respaldo al release"
      fallos=$((fallos+1)); rm -rf "$tmp"; continue
    fi
    local tam_local info tam_remoto act_remota edad
    tam_local=$(wc -c < "$tar_local" | tr -d ' ')
    info=$(gh release view "$TAG" --json assets --jq ".assets[] | select(.name==\"$asset\") | \"\(.size) \(.updatedAt)\"" 2>/dev/null)
    tam_remoto=${info%% *}; act_remota=${info#* }
    if [ -z "$info" ]; then
      echo "  $cat $T: ⚠ subido sin error, pero el release no lista el asset $asset"
      fallos=$((fallos+1))
    elif [ "$tam_remoto" != "$tam_local" ]; then
      echo "  $cat $T: ⚠ el asset del release pesa $tam_remoto bytes y el tar subido $tam_local"
      fallos=$((fallos+1))
    else
      edad=$(node -p "Math.round((Date.now()-new Date('$act_remota'))/1000)" 2>/dev/null || echo 999999)
      if [ "$edad" -gt 900 ]; then
        echo "  $cat $T: ⚠ el asset del release es de hace ${edad}s: la subida no lo ha reemplazado"
        fallos=$((fallos+1))
      else
        echo "  $cat $T: subidas $n actas al release (verificado: $tam_remoto bytes, actualizado hace ${edad}s)"
      fi
    fi
    rm -rf "$tmp"
  done
  [ "$fallos" -eq 0 ]
}

case "${1:-}" in
  restaurar) shift; restaurar "${1:-}";;
  publicar)  publicar;;
  *) echo "Uso: $0 restaurar [--forzar] | publicar" >&2; exit 2;;
esac
