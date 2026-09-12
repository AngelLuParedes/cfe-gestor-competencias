// Acepta email estándar O clave alfanumérica (como RPE) de exactamente 5 caracteres
export const IDENTIFICADOR_REGEX = /^([a-zA-Z0-9]{5}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export function esIdentificadorValido(valor: string): boolean {
  return typeof valor === 'string' && IDENTIFICADOR_REGEX.test(valor.trim());
}