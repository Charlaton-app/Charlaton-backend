import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
} from "../controllers/user.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route GET /users
 * @desc Obtiene todos los usuarios o busca un usuario específico por email
 * @access Público
 * @query {string} [email] - Email del usuario a buscar (opcional)
 * @returns {object} 200 - Array de usuarios o usuario específico si se proporciona email
 * @returns {object} 404 - Usuario no encontrado (cuando se busca por email)
 * @returns {object} 500 - Error del servidor
 */
router.get("/", getAllUsers);

/**
 * @route GET /users/:id
 * @desc Obtiene un usuario específico por ID
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @param {string} id - ID del usuario a obtener
 * @returns {object} 200 - Datos del usuario
 * @returns {object} 401 - No autenticado
 * @returns {object} 404 - Usuario no encontrado
 * @returns {object} 500 - Error del servidor
 */
router.get("/:id", verifyToken, getUserById);

/**
 * @route POST /users
 * @desc Crea un nuevo usuario
 * @access Público
 * @body {string} email - Email del usuario (requerido)
 * @body {string} password - Contraseña del usuario (requerido)
 * @body {string} [nickname] - Nombre de usuario (opcional)
 * @body {string} [rolId] - ID del rol asignado (opcional)
 * @body {string} [id] - ID personalizado para el usuario (opcional, si no se proporciona se genera automáticamente)
 * @returns {object} 201 - Usuario creado exitosamente
 * @returns {object} 400 - Email ya registrado, usuario ya existe, o datos faltantes
 * @returns {object} 500 - Error del servidor
 */
router.post("/", createUser);

/**
 * @route PUT /users/:id
 * @desc Actualiza información de un usuario (email, nickname)
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @param {string} id - ID del usuario a actualizar
 * @body {string} [email] - Nuevo email del usuario
 * @body {string} [nickname] - Nuevo nickname del usuario
 * @returns {object} 200 - Usuario actualizado exitosamente
 * @returns {object} 401 - No autenticado
 * @returns {object} 404 - Usuario no encontrado
 * @returns {object} 500 - Error del servidor
 */
router.put("/:id", verifyToken, updateUser);

/**
 * @route PUT /users/password/:id
 * @desc Cambia la contraseña de un usuario
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @param {string} id - ID del usuario
 * @body {string} password - Nueva contraseña
 * @body {string} confirmPassword - Confirmación de la nueva contraseña
 * @returns {object} 200 - Contraseña actualizada exitosamente
 * @returns {object} 400 - Contraseñas no coinciden
 * @returns {object} 401 - No autenticado
 * @returns {object} 404 - Usuario no encontrado
 * @returns {object} 500 - Error del servidor
 */
router.put("/password/:id", verifyToken, changePassword);

/**
 * @route DELETE /users/:id
 * @desc Elimina un usuario de la base de datos
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @param {string} id - ID del usuario a eliminar
 * @returns {object} 200 - Usuario eliminado exitosamente
 * @returns {object} 401 - No autenticado
 * @returns {object} 500 - Error del servidor
 */
router.delete("/:id", verifyToken, deleteUser);

export default router;
