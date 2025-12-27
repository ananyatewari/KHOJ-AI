import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import io from "socket.io-client";

const AlertsContext = createContext();

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error("useAlerts must be used within AlertsProvider");
  }
  return context;
}

export function AlertsProvider({ children }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);

  useEffect(() => {
    if (user) {
      fetchAlerts();

      fetchUnreadCount();

      const newSocket = io("http://localhost:3000");
      setSocket(newSocket);

      // Debug socket connection
      newSocket.on("connect", () => {
        console.log(`[DEBUG] Socket connected with ID: ${newSocket.id}`);
        console.log(
          `[DEBUG] User agency: ${user.agency}, listening for: alert:agency:${user.agency}`
        );
      });

      newSocket.on("disconnect", () => {
        console.log("[DEBUG] Socket disconnected");
      });

      // Only listen for MongoDB-based alerts
      newSocket.on(`alert:${user.agency}`, (alert) => {
        setAlerts((prev) => [alert, ...prev]);
        setUnreadCount((prev) => prev + 1);
        addToast(alert);
      });

      newSocket.on("alert:all", (alert) => {
        setAlerts((prev) => [alert, ...prev]);
        setUnreadCount((prev) => prev + 1);
        addToast(alert);
      });

      // Listen for agency-specific notifications from notify button
      newSocket.on(`alert:agency:${user.agency}`, (data) => {
        console.log(
          `[DEBUG] Received agency notification for ${user.agency}:`,
          data
        );
        // Create a notification toast for agency notifications
        if (data.alert && data.message) {
          const notificationAlert = {
            ...data.alert,
            title: `Agency Notification: ${data.alert.title}`,
            description: data.message || data.alert.description,
            severity: data.alert.severity,
            createdAt: new Date(),
            _id: `notification-${Date.now()}`,
          };

          console.log(
            `[DEBUG] Creating toast for agency notification:`,
            notificationAlert
          );
          addToast(notificationAlert);
        } else {
          console.log(`[DEBUG] No alert or message in notification data`);
        }
      });

      // Debug: Listen to all agency notifications to see what's being sent
      newSocket.onAny((eventName, data) => {
        if (eventName.startsWith("alert:agency:")) {
          console.log(`[DEBUG] Caught agency notification: ${eventName}`, data);
        }
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/alerts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:3000/api/alerts/unread-count",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setUnreadCount(data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/alerts/${alertId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const updatedAlert = await response.json();

      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? updatedAlert : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      return updatedAlert;
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const acknowledgeAlert = async (alertId, actionTaken) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/alerts/${alertId}/acknowledge`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ actionTaken }),
        }
      );
      const updatedAlert = await response.json();

      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? updatedAlert : a))
      );

      return updatedAlert;
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/alerts/${alertId}/dismiss`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const updatedAlert = await response.json();

      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? updatedAlert : a))
      );

      return updatedAlert;
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  const notifyAgencies = async (alertId, agencies, message) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/alerts/${alertId}/notify-agencies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ agencies, method: "internal", message }),
        }
      );
      const result = await response.json();

      if (result.success) {
        setAlerts((prev) =>
          prev.map((a) => (a._id === alertId ? result.alert : a))
        );
      }

      return result;
    } catch (error) {
      console.error("Error notifying agencies:", error);
    }
  };

  const addToast = (alert) => {
    console.log(`[DEBUG] addToast called with alert:`, alert);
    const toast = {
      id: Date.now() + Math.random(),
      alert,
      timestamp: new Date(),
    };
    setToastQueue((prev) => {
      console.log(
        `[DEBUG] Adding toast to queue. Current count: ${
          prev.length
        }, new count: ${prev.length + 1}`
      );
      return [...prev, toast];
    });

    // Play notification sound for high/medium severity
    if (alert.severity === "high" || alert.severity === "medium") {
      playNotificationSound(alert.severity);
    }

    setTimeout(() => {
      removeToast(toast.id);
    }, 8000);
  };

  const createDomNotification = (alert) => {
    // Play notification sound
    playNotificationSound(alert.severity);

    // Create notification element
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${
        alert.severity === "high"
          ? "#ef4444"
          : alert.severity === "medium"
          ? "#f59e0b"
          : "#3b82f6"
      };
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${alert.title}</div>
      <div style="opacity: 0.9; font-size: 12px;">${alert.description}</div>
    `;

    // Add animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Add to DOM
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = "slideIn 0.3s ease-out reverse";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);

    // Click to dismiss
    notification.addEventListener("click", () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  };

  const removeToast = (toastId) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== toastId));
  };

  const playNotificationSound = (severity = "medium") => {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Create oscillator for sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set frequency based on severity
      switch (severity) {
        case "high":
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher pitch for high severity
          break;
        case "medium":
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // Medium pitch
          break;
        case "low":
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime); // Lower pitch for low severity
          break;
        default:
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      }

      // Set sound type
      oscillator.type = "sine";

      // Set volume (gain)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Start at 30% volume
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      ); // Fade out quickly

      // Play sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5); // Play for 0.5 seconds
    } catch (error) {
      console.log("Audio playback not supported or blocked:", error);
    }
  };

  // Test function for debugging
  const testNotification = () => {
    console.log("[DEBUG] Testing notification system");
    addToast({
      title: "Test Notification",
      description: "This is a test notification",
      severity: "medium",
      type: "test",
      createdAt: new Date(),
      _id: "test-" + Date.now(),
    });
  };

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        unreadCount,
        toastQueue,
        fetchAlerts,
        markAsRead,
        acknowledgeAlert,
        dismissAlert,
        notifyAgencies,
        removeToast,
        testNotification,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}
