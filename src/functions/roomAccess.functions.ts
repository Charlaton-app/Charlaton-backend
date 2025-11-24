
import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Obtener acceso de un usuario a una sala
 */
export const getRoomAccessForUser = async (userId: any, roomId: any) => {
  try {

    const accessSnap = await ROOMS.doc(String(roomId))
      .collection("access")
      .where("userId", "==", Number(userId))
      .get();

    if (accessSnap.empty)
      return {userId: userId, success: false};

    const access = accessSnap.docs.map((d) => ({ id: d.id, ...d.data() }))[0];

    return {userId: userId,access: access, success: true};
  } catch (error) {
    return {userId: userId, success: false};
  }
};

/**
 * Obtener todos los accesos de una sala
 */
export const getRoomAccessByRoomId = async (roomId: any) => {
  try {
    
    const accessSnap = await ROOMS.doc(roomId).collection("access").get();

    const access = accessSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return {roomId: roomId, message : "accesos obtenidos correctamente", success: true};
  } catch (error) {
    return {roomId: roomId, message : "error al obtener accesos", success: false};
  }
};

/**
 * Crear acceso a sala
 */
export const createRoomAccess = async (userId: any, roomId: any, grantedBy: any) => {
  try {

    const accessRef = ROOMS.doc(String(roomId))
      .collection("access")
      .doc();

    const accessData = {
      userId: Number(userId),
      grantedBy: Number(grantedBy),
      grantedAt: new Date().toISOString(),
    };

    await accessRef.set(accessData);

    return {id: accessRef.id, ...accessData, message: "aceso a sala creado correctamente", success: true };

  } catch (error) {
    return {id:null, message: "error al crear acceso", success: false};
  }
};

/**
 * Eliminar acceso
 */
export const deleteRoomAccess = async (userId: any, roomId: any) => {
  try {

    const snap = await ROOMS.doc(String(roomId))
      .collection("access")
      .where("userId", "==", Number(userId))
      .get();

    if (snap.empty)
      return {access: null, message: "error al eliminar acceso", success: false};

    const docId = snap.docs[0].id;

    await ROOMS.doc(String(roomId)).collection("access").doc(docId).delete();

    return {access: snap, message: "acceso eliminado", success: true};
  } catch (error) {
    return {access: null, message: "error al eliminar acceso", success: false};
  }
};
