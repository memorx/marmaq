/**
 * Convierte una fecha a un string relativo legible en español.
 * Ej: "hace 5 min", "hace 2h", "hace 3d", "hace 1 semana"
 */
export function tiempoRelativo(fecha: Date | string): string {
  const ahora = new Date();
  const fechaDate = typeof fecha === "string" ? new Date(fecha) : fecha;
  const diffMs = ahora.getTime() - fechaDate.getTime();

  // Si la fecha es futura, retornar "ahora"
  if (diffMs < 0) {
    return "ahora";
  }

  const segundos = Math.floor(diffMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  const semanas = Math.floor(dias / 7);
  const meses = Math.floor(dias / 30);

  if (segundos < 60) {
    return "ahora";
  }

  if (minutos < 60) {
    return `hace ${minutos} min`;
  }

  if (horas < 24) {
    return `hace ${horas}h`;
  }

  if (dias < 7) {
    return dias === 1 ? "hace 1 día" : `hace ${dias}d`;
  }

  if (semanas < 4) {
    return semanas === 1 ? "hace 1 semana" : `hace ${semanas} semanas`;
  }

  if (meses < 12) {
    return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;
  }

  const años = Math.floor(meses / 12);
  return años === 1 ? "hace 1 año" : `hace ${años} años`;
}
