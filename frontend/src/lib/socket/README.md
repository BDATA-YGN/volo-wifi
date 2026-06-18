# Socket Implementation - Robust Connection Management

This directory contains a comprehensive socket implementation with robust connection management, automatic reconnection, and health monitoring.

## Overview

The new socket implementation provides:
- **Robust reconnection logic** with exponential backoff
- **Health monitoring** with ping/pong mechanism
- **Connection status tracking** with detailed metrics
- **Context-based architecture** for easy integration
- **Automatic error recovery** and connection persistence
- **Real-time status indicators** in the UI

## Architecture

### Core Components

1. **SocketProvider** (`SocketProvider.tsx`) - React context provider for socket management
2. **SocketManager** (`socketManager.ts`) - Core socket management class
3. **Status Indicators** - UI components for connection monitoring
4. **Health Monitor** - Advanced connection health tracking

### File Structure

```
src/lib/socket/
├── SocketProvider.tsx          # React context provider
├── socketManager.ts            # Core socket management
├── socketClient.ts             # Legacy client (deprecated)
├── socketStore.ts              # Legacy store (deprecated)
├── useSocket.ts                # Legacy hook (deprecated)
├── sioConstants.ts             # Socket event constants
└── README.md                   # This file

src/common/components/
├── SocketStatusIndicator.tsx   # Simple status indicator
├── SocketHealthMonitor.tsx     # Advanced health monitoring
└── SocketConnectionTest.tsx    # Connection testing tool
```

## Usage

### Basic Usage

```tsx
import { useSocket, useSocketStatus } from '@/lib/socket/SocketProvider';

function MyComponent() {
  const { socket, emit, on, isConnected } = useSocket();
  const { status, reconnectAttempts, lastError } = useSocketStatus();

  // Emit events
  const sendMessage = () => {
    emit('message', { text: 'Hello World' });
  };

  // Listen to events
  useEffect(() => {
    const cleanup = on('notification', (data) => {
      console.log('Received notification:', data);
    });
    return cleanup;
  }, [on]);

  return (
    <div>
      <p>Status: {status}</p>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
}
```

### Advanced Usage with Health Monitoring

```tsx
import { useSocketEvent } from '@/lib/socket/SocketProvider';
import SocketHealthMonitor from '@/common/components/SocketHealthMonitor';

function AdvancedComponent() {
  const { isConnected, status } = useSocketStatus();

  // Listen to specific events with automatic cleanup
  useSocketEvent('user-update', (userData) => {
    console.log('User updated:', userData);
  }, []);

  return (
    <div>
      <SocketHealthMonitor showDetails={true} />
      {isConnected && <div>Real-time features available</div>}
    </div>
  );
}
```

## Features

### 1. Robust Reconnection

- **Exponential backoff** with jitter to prevent thundering herd
- **Configurable retry attempts** (default: 10)
- **Automatic reconnection** on connection loss
- **Manual reconnection** support

### 2. Health Monitoring

- **Ping/pong mechanism** every 30 seconds
- **Connection quality tracking**
- **Uptime percentage calculation**
- **Error rate monitoring**

### 3. Status Management

- **Real-time status updates**
- **Connection history tracking**
- **Error logging and reporting**
- **Visual status indicators**

### 4. Event Management

- **Type-safe event handling**
- **Automatic listener cleanup**
- **Error handling in listeners**
- **Event deduplication**

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_PATH=/socket.io
```

### Socket Options

```tsx
const socketOptions = {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: false, // We handle manually
  forceNew: true,
  maxReconnectAttempts: 10,
  baseReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  healthCheckInterval: 30000,
  enableLogging: true,
};
```

## Components

### SocketStatusIndicator

Simple status indicator showing connection state.

```tsx
import SocketStatusIndicator from '@/common/components/SocketStatusIndicator';

<SocketStatusIndicator showDetails={false} />
```

### SocketHealthMonitor

Advanced health monitoring with detailed metrics.

```tsx
import SocketHealthMonitor from '@/common/components/SocketHealthMonitor';

<SocketHealthMonitor 
  showDetails={true}
  onStatusChange={(status, isHealthy) => {
    console.log('Socket status changed:', status, isHealthy);
  }}
/>
```

### SocketConnectionTest

Development tool for testing socket connections.

```tsx
import SocketConnectionTest from '@/common/components/SocketConnectionTest';

<SocketConnectionTest />
```

## Integration

### App Layout Integration

The SocketProvider is integrated at the app level in `app/layout.tsx`:

```tsx
import { SocketProvider } from '@/lib/socket/SocketProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
```

### Layout Integration

Socket status is monitored in dashboard and NGO layouts:

```tsx
import { useSocket, useSocketStatus } from '@/lib/socket/SocketProvider';

function Layout({ children }) {
  const { on, emit } = useSocket();
  const { status, isConnected } = useSocketStatus();

  useEffect(() => {
    const cleanup = on('broadcast-event', (data) => {
      console.log('Broadcast received:', data);
    });
    return cleanup;
  }, [on]);

  return <div>{children}</div>;
}
```

## Migration from Legacy Implementation

### Before (Legacy)

```tsx
import { useSocket } from '@/lib/socket/useSocket';

function MyComponent() {
  const { handleInitialSetup, socketStatus, listen } = useSocket();
  
  useEffect(() => {
    handleInitialSetup();
    const unsubscribe = listen('event', callback);
    return unsubscribe;
  }, []);
}
```

### After (New Implementation)

```tsx
import { useSocket, useSocketStatus } from '@/lib/socket/SocketProvider';

function MyComponent() {
  const { on, emit, isConnected } = useSocket();
  const { status } = useSocketStatus();
  
  useEffect(() => {
    const cleanup = on('event', callback);
    return cleanup;
  }, [on]);
}
```

## Troubleshooting

### Common Issues

1. **Connection not establishing**
   - Check `NEXT_PUBLIC_SOCKET_URL` environment variable
   - Verify server is running and accessible
   - Check network connectivity

2. **Frequent disconnections**
   - Check server stability
   - Review network conditions
   - Monitor reconnection attempts

3. **Events not received**
   - Verify event names match server
   - Check listener registration
   - Review error logs

### Debug Tools

1. **SocketConnectionTest** - Comprehensive connection testing
2. **Browser DevTools** - Network tab for WebSocket connections
3. **Console Logs** - Detailed logging with `enableLogging: true`

### Performance Monitoring

- Monitor connection uptime percentage
- Track reconnection frequency
- Watch for error patterns
- Monitor event throughput

## Best Practices

1. **Always use cleanup functions** for event listeners
2. **Handle connection states** gracefully in UI
3. **Implement fallback mechanisms** for critical features
4. **Monitor connection health** in production
5. **Use type-safe event handling** with TypeScript

## Future Enhancements

- [ ] Connection pooling for multiple servers
- [ ] Message queuing for offline scenarios
- [ ] Advanced retry strategies
- [ ] Performance metrics dashboard
- [ ] Automatic failover support
