import IngestionLog from "../models/IngestionLog.js";

export async function emitLog(io, payload) {
  const log = await IngestionLog.create(payload);

  io.emit("system:log", {
    id: log._id,
    ...payload,
    timestamp: log.createdAt
  });
}
