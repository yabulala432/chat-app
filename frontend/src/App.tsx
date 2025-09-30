import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import io from "socket.io-client";
import "./App.css";

const App = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({
    email: "",
    username: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem("chat_token");
    if (token) {
      const newSocket = io(
        import.meta.env.VITE_BACKEND_URL || "http://localhost:3001",
        {
          auth: {
            token: token,
          },
        }
      );
      setSocket(newSocket);

      newSocket.on("recent_messages", (recentMessages) => {
        setMessages(recentMessages.reverse());
      });

      newSocket.on("new_message", (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
      });

      newSocket.on("user_typing", (data) => {
        setTypingUsers((prev) => {
          const filtered = prev.filter((user) => user.id !== data.user.id);
          if (data.isTyping) {
            return [...filtered, data.user];
          }
          return filtered;
        });
      });

      newSocket.on("online_users", (users) => {
        setOnlineUsers(users);
      });

      newSocket.on("user_online", (user) => {
        setOnlineUsers((prev) => {
          const filtered = prev.filter((u) => u.id !== user.id);
          return [...filtered, user];
        });
      });

      newSocket.on("user_offline", (user) => {
        setOnlineUsers((prev) => prev.filter((u) => u.id !== user.id));
      });

      newSocket.on("available_rooms", (availableRooms) => {
        setRooms(availableRooms);
      });

      newSocket.on("user_joined_room", (data) => {
        console.log(`${data.user.username} joined room ${data.roomId}`);
      });

      newSocket.on("user_left_room", (data) => {
        console.log(`${data.user.username} left room ${data.roomId}`);
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
        alert(error.message || "An error occurred");
      });

      newSocket.on("room_updated", (updatedRooms) => {
        setRooms(updatedRooms);
      });

      // Load user data from token
      const userData = localStorage.getItem("chat_user");
      if (userData) {
        setUser(JSON.parse(userData));
      }

      return () => newSocket.close();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? "login" : "register";
      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"
        }/auth/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(authData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      if (isLogin) {
        localStorage.setItem("chat_token", data.access_token);
        localStorage.setItem("chat_user", JSON.stringify(data.user));
        setUser(data.user);
        window.location.reload();
      } else {
        setIsLogin(true);
        setAuthData({ email: "", username: "", password: "" });
        alert("Registration successful! Please login.");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_user");
    setUser(null);
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);
    setMessages([]);
    setOnlineUsers([]);
    setCurrentRoom(null);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && user) {
      socket.emit("send_message", {
        content: message.trim(),
        roomId: currentRoom,
      });
      setMessage("");
      stopTyping();
    }
  };

  const handleTyping = () => {
    if (user) {
      socket.emit("typing", {
        isTyping: true,
        roomId: currentRoom,
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", {
          isTyping: false,
          roomId: currentRoom,
        });
      }, 1000);
    }
  };

  const stopTyping = () => {
    if (user) {
      socket.emit("typing", {
        isTyping: false,
        roomId: currentRoom,
      });
    }
  };

  const joinRoom = (roomId) => {
    if (socket && user) {
      socket.emit("join_room", { roomId });
      setCurrentRoom(roomId);
      setMessages([]);
    }
  };

  const leaveRoom = () => {
    if (socket && user && currentRoom) {
      socket.emit("leave_room", { roomId: currentRoom });
      setCurrentRoom(null);
      setMessages([]);
    }
  };

  const createRoom = () => {
    if (socket && user && newRoomName.trim()) {
      socket.emit("create_room", {
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
        isPrivate: false,
      });
      setNewRoomName("");
      setNewRoomDescription("");
      setShowCreateRoom(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Authentication Form
  if (!user) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <form onSubmit={handleAuth}>
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Username"
                  value={authData.username}
                  onChange={(e) =>
                    setAuthData({ ...authData, username: e.target.value })
                  }
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authData.email}
                onChange={(e) =>
                  setAuthData({ ...authData, email: e.target.value })
                }
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authData.password}
                onChange={(e) =>
                  setAuthData({ ...authData, password: e.target.value })
                }
                required
              />
              <button type="submit" className="auth-submit-btn">
                {isLogin ? "Login" : "Register"}
              </button>
            </form>
            <p className="auth-toggle-text">
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <span
                onClick={() => setIsLogin(!isLogin)}
                className="auth-toggle"
              >
                {isLogin ? "Register" : "Login"}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="app">
      <div className="chat-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="user-info">
            <div className="user-avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <strong>{user.username}</strong>
              <span className="online-status">Online</span>
            </div>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>

          <div className="rooms-section">
            <div className="rooms-header">
              <h3>Rooms</h3>
              <button
                onClick={() => setShowCreateRoom(!showCreateRoom)}
                className="create-room-btn"
                title="Create new room"
              >
                +
              </button>
            </div>

            {showCreateRoom && (
              <div className="create-room-form">
                <input
                  type="text"
                  placeholder="Room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={50}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  maxLength={100}
                />
                <div className="create-room-actions">
                  <button
                    onClick={createRoom}
                    disabled={!newRoomName.trim()}
                    className="create-btn"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateRoom(false);
                      setNewRoomName("");
                      setNewRoomDescription("");
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="rooms-list">
              <div
                className={`room-item ${!currentRoom ? "active" : ""}`}
                onClick={() => setCurrentRoom(null)}
              >
                <div className="room-info">
                  <span className="room-name"># General</span>
                  <span className="room-description">Main chat room</span>
                </div>
              </div>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`room-item ${
                    currentRoom === room.id ? "active" : ""
                  }`}
                  onClick={() => joinRoom(room.id)}
                >
                  <div className="room-info">
                    <span className="room-name"># {room.name}</span>
                    {room.description && (
                      <span className="room-description">
                        {room.description}
                      </span>
                    )}
                  </div>
                  <span className="room-count">{room._count?.users || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="online-users">
            <h3>Online Users ({onlineUsers.length})</h3>
            <div className="users-list">
              {onlineUsers.map((onlineUser) => (
                <div key={onlineUser.id} className="user-item">
                  <div className="user-avatar small">
                    {onlineUser.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="username">{onlineUser.username}</span>
                  <div className="online-dot"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="main-chat">
          <div className="chat-header">
            <div className="chat-header-info">
              <h1>
                {currentRoom
                  ? `# ${
                      rooms.find((r) => r.id === currentRoom)?.name || "Room"
                    }`
                  : "General Chat"}
              </h1>
              {currentRoom &&
                rooms.find((r) => r.id === currentRoom)?.description && (
                  <p className="room-description-header">
                    {rooms.find((r) => r.id === currentRoom)?.description}
                  </p>
                )}
            </div>
            {currentRoom && (
              <button onClick={leaveRoom} className="leave-room-btn">
                Leave Room
              </button>
            )}
          </div>

          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Be the first to start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="message">
                  <div className="message-header">
                    <div className="message-user">
                      <div className="user-avatar small">
                        {msg.user?.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <span className="username">
                        {msg.user?.username || msg.username || "Unknown"}
                      </span>
                    </div>
                    <span className="timestamp">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className="message-content">
                    {msg.content || msg.message}
                  </div>
                </div>
              ))
            )}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                {typingUsers.map((user) => user.username).join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="message-form">
            <div className="message-input-container">
              <input
                type="text"
                placeholder={`Message ${
                  currentRoom
                    ? rooms.find((r) => r.id === currentRoom)?.name
                    : "general"
                }...`}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onBlur={stopTyping}
                className="message-input"
                disabled={!user}
                required
              />
              <button
                type="submit"
                disabled={!message.trim() || !user}
                className="send-btn"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
