export interface UserCreateInput {
    nombres: string;
    apellidos: string;
    edad: number;
    correoElectronico: string;
    contraseña: string;
  }
  
  export interface UserResponse {
    id: string;
    nombres: string;
    apellidos: string;
    edad: number;
    correoElectronico: string;
    createdAt: Date;
  }
  