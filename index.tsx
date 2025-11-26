import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('🚀 Starting NEXA AI System...');

// Create App component directly here
const App = () => {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    console.log('🔧 Checking for saved user...');
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        console.log('✅ User loaded:', parsedUser.name);
      } catch (error) {
        console.error('❌ Error parsing user:', error);
      }
    }
  }, []);

  const handleLogin = () => {
    console.log('✅ User logging in...');
    const userData = {
      name: 'Chandan',
      mobile: '0000000000',
      role: 'ADMIN'
    };
    setUser(userData);
    localStorage.setItem('nexa_user', JSON.stringify(userData));
    
    // Play intro after login
    setTimeout(() => {
      const hour = new Date().getHours();
      let greeting = 'Good morning';
      if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
      else if (hour >= 18) greeting = 'Good evening';
      
      const introMessage = `मैं Nexa हूँ — आपकी Personal AI Assistant, जिसे Chandan Lohave ने design किया है. ${greeting}! लगता है आज आपका mood मेरे जैसा perfect है. बताइए Chandan sir, मैं आपकी किस प्रकार सहायता कर सकती हूँ?`;
      
      console.log('🎯 Intro message:', introMessage);
      
      // Speak the message
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(introMessage);
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }
    }, 1000);
  };

  const handleLogout = () => {
    console.log('🔒 User logging out...');
    setUser(null);
    localStorage.removeItem('nexa_user');
  };

  if (!user) {
    return (
      <div style={{
        background: '#000',
        color: '#29DFFF',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Rajdhani, sans-serif',
        textAlign: 'center'
      }}>
        {/* Background Effects */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            linear-gradient(rgba(41, 223, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(41, 223, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          zIndex: 0
        }}></div>
        
        {/* HUD Circle */}
        <div style={{
          width: '200px',
          height: '200px',
          border: '2px solid #29DFFF',
          borderRadius: '50%',
          position: 'relative',
          boxShadow: '0 0 30px rgba(41, 223, 255, 0.5)',
          marginBottom: '30px'
        }}>
          <div style={{
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            right: '-2px',
            bottom: '-2px',
            border: '1px solid #29DFFF',
            borderRadius: '50%',
            animation: 'spin 8s linear infinite'
          }}></div>
        </div>

        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '10px',
          textShadow: '0 0 20px #29DFFF'
        }}>
          NEXA
        </h1>
        
        <p style={{ color: '#fff', marginBottom: '30px', fontSize: '1.2rem' }}>
          AI Personal Assistant
        </p>
        
        <button 
          onClick={handleLogin}
          style={{
            background: '#29DFFF',
            color: '#000',
            border: 'none',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: 'bold',
            borderRadius: '5px',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(41, 223, 255, 0.5)',
            zIndex: 10
          }}
        >
          ENTER SYSTEM
        </button>
        
        <p style={{ color: '#666', marginTop: '30px', fontSize: '0.9rem' }}>
          Created by Chandan Lohave
        </p>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      background: '#000',
      color: '#fff',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Rajdhani, sans-serif'
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          linear-gradient(rgba(41, 223, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(41, 223, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        zIndex: 0
      }}></div>

      {/* Status Bar */}
      <div style={{
        height: '60px',
        borderBottom: '1px solid rgba(41, 223, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 10
      }}>
        <div style={{ color: '#29DFFF', fontSize: '12px' }}>SYSTEM ONLINE</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>NEXA</div>
        <button 
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: '#29DFFF',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          LOGOUT
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{
          width: '200px',
          height: '200px',
          border: '2px solid #29DFFF',
          borderRadius: '50%',
          position: 'relative',
          boxShadow: '0 0 30px rgba(41, 223, 255, 0.5)',
          marginBottom: '30px'
        }}>
          <div style={{
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            right: '-2px',
            bottom: '-2px',
            border: '1px solid #29DFFF',
            borderRadius: '50%',
            animation: 'spin 8s linear infinite'
          }}></div>
        </div>

        <h2 style={{ color: '#29DFFF', marginBottom: '20px' }}>
          Welcome {user.name}!
        </h2>
        
        <p style={{ marginBottom: '30px' }}>
          NEXA AI Assistant is ready to help you
        </p>

        <button 
          onClick={() => {
            if ('speechSynthesis' in window) {
              const message = "Hello! Main NEXA hoon. Aapki kya madad kar sakti hoon?";
              const utterance = new SpeechSynthesisUtterance(message);
              utterance.rate = 0.9;
              speechSynthesis.speak(utterance);
            }
          }}
          style={{
            background: '#29DFFF',
            color: '#000',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          TEST VOICE
        </button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

console.log('✅ App component created');

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('✅ Root element found');
  const root = createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('✅ NEXA App rendered successfully');
} else {
  console.error('❌ Root element not found!');
}