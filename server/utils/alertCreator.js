import Alert from "../models/Alert.js";

export async function createRealTimeAlert(alertData) {
  try {
    const alert = new Alert({
      ...alertData,
      triggeredBy: "System"
    });

    await alert.save();

    // Emit WebSocket notification
    const io = global.io;
    if (io) {
      if (alert.agencies && alert.agencies.length > 0) {
        alert.agencies.forEach(agency => {
          io.emit(`alert:${agency}`, alert.toObject());
        });
      } else {
        io.emit("alert:all", alert.toObject());
      }
    }

    console.log("Alert created successfully:", alert.title);
    return alert;
  } catch (error) {
    console.error("Error creating real-time alert:", error);
    return null;
  }
}
