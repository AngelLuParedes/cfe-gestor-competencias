export interface Constancia {
    id_constancia?: number;
    rpe_trabajador: string;
    actividad_rel: string; // <--- CAMBIADO: Antes era clave_curso
    puesto_en_constancia: string;
    clave_ocupacion: string;
    clave_area_stps: string; 
    fecha_emision?: string;
}