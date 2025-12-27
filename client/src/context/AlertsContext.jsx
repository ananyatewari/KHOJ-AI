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

      newSocket.on(`alert:${user.agency}`, (alert) => {
        setAlerts(prev => [alert, ...prev]);
        setUnreadCount(prev => prev + 1);
        addToast(alert);
      });

      newSocket.on("alert:all", (alert) => {
        setAlerts(prev => [alert, ...prev]);
        setUnreadCount(prev => prev + 1);
        addToast(alert);
      });

      newSocket.on(`alert:agency:${user.agency}`, (data) => {
        addToast({
          ...data.alert,
          title: `Agency Notification: ${data.alert.title}`,
          description: data.message || data.alert.description
        });
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
          Authorization: `Bearer ${token}`
        }
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
      const response = await fetch("http://localhost:3000/api/alerts/unread-count", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      setUnreadCount(data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/alerts/${alertId}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const updatedAlert = await response.json();
      
      setAlerts(prev => prev.map(a => a._id === alertId ? updatedAlert : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return updatedAlert;
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const acknowledgeAlert = async (alertId, actionTaken) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/alerts/${alertId}/acknowledge`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ actionTaken })
      });
      const updatedAlert = await response.json();
      
      setAlerts(prev => prev.map(a => a._id === alertId ? updatedAlert : a));
      
      return updatedAlert;
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/alerts/${alertId}/dismiss`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const updatedAlert = await response.json();
      
      setAlerts(prev => prev.map(a => a._id === alertId ? updatedAlert : a));
      
      return updatedAlert;
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  const notifyAgencies = async (alertId, agencies, message) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/alerts/${alertId}/notify-agencies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ agencies, method: "internal", message })
      });
      const result = await response.json();
      
      if (result.success) {
        setAlerts(prev => prev.map(a => a._id === alertId ? result.alert : a));
      }
      
      return result;
    } catch (error) {
      console.error("Error notifying agencies:", error);
    }
  };

  const addToast = (alert) => {
    const toast = {
      id: Date.now() + Math.random(),
      alert,
      timestamp: new Date()
    };
    setToastQueue(prev => [...prev, toast]);
    
    setTimeout(() => {
      removeToast(toast.id);
    }, 8000);
  };

  const removeToast = (toastId) => {
    setToastQueue(prev => prev.filter(t => t.id !== toastId));
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
        removeToast
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}
