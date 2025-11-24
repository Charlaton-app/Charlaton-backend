import { Router } from "express";
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  changePassword,
  addAdmin,
  removeAdmin
} from "../controllers/room.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route GET /rooms
 * @desc Obtiene todas las salas que no estén eliminadas, incluyendo sus subRooms y connections
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @returns {object} 200 - Array de salas con sus subcolecciones
 * @returns {object} 401 - No autenticado
 * @returns {object} 500 - Error del servidor
 */
router.get("/", verifyToken, getAllRooms);

/**
 * @route GET /rooms/:id
 * @desc Obtiene una sala específica por ID, incluyendo sus subRooms y connections
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @param {string} id - ID de la sala a obtener
 * @returns {object} 200 - Datos de la sala con sus subcolecciones
 * @returns {object} 401 - No autenticado
 * @returns {object} 404 - Sala no encontrada o eliminada
 * @returns {object} 500 - Error del servidor
 */
router.get("/:id", verifyToken, getRoomById);

/**
 * @route POST /rooms
 * @desc Crea una nueva sala
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @body {string} name - Nombre de la sala (requerido)
 * @body {string} creatorId - ID del usuario creador (requerido)
 * @body {string} [password] - Contraseña de la sala (opcional)
 * @body {string} [parentRoomId] - ID de la sala padre (opcional)
 * @body {boolean} [private] - Indica si la sala es privada (opcional, default: false)
 * @body {string} [scheduleAt] - Fecha/hora programada (opcional)
 * @returns {object} 201 - Sala creada exitosamente
 * @returns {object} 401 - No autenticado
 * @returns {object} 500 - Error del servidor
 */
router.post("/", verifyToken, createRoom);

/**
 * @route PUT /rooms/password/:id
 * @desc Cambia la contraseña de una sala específica
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @param {string} id - ID de la sala
 * @body {string} password - Nueva contraseña
 * @body {string} confirmPassword - Confirmación de la nueva contraseña
 * @returns {object} 200 - Contraseña actualizada exitosamente
 * @returns {object} 400 - Contraseñas no coinciden
 * @returns {object} 401 - No autenticado
 * @returns {object} 404 - Sala no encontrada
 * @returns {object} 500 - Error del servidor
 */
router.put("/password/:id", verifyToken, changePassword);

/**
 * @route PUT /rooms/:id
 * @desc Actualiza los datos de una sala (name, private, scheduleAt)
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @param {string} id - ID de la sala a actualizar
 * @body {string} [name] - Nuevo nombre de la sala
 * @body {boolean} [private] - Nuevo estado de privacidad
 * @body {string} [scheduleAt] - Nueva fecha/hora programada
 * @returns {object} 200 - Sala actualizada exitosamente
 * @returns {object} 401 - No autenticado
 * @returns {object} 500 - Error del servidor
 */
router.put("/:id", verifyToken, updateRoom);

/**
 * @route DELETE /rooms/:id
 * @desc Realiza eliminación lógica (soft delete) de una sala
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @param {string} id - ID de la sala a eliminar
 * @returns {object} 200 - Sala eliminada exitosamente (deletedAt actualizado)
 * @returns {object} 401 - No autenticado
 * @returns {object} 500 - Error del servidor
 */
router.delete("/:id", verifyToken, deleteRoom);
router.post("/admin/:id",verifyToken, addAdmin);
router.delete("/admin/:id",verifyToken, removeAdmin);

export default router;
