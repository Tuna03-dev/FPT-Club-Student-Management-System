import React from 'react';
import { authService } from '../../services/authService';

const Dashboard: React.FC = () => {
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard</h1>
      {user && (
        <div>
          <h2>Chào mừng, {user.fullName}!</h2>
          <p>Email: {user.email}</p>
          <p>Vai trò: {user.systemRole}</p>
          {user.avatarUrl && (
            <img 
              src={user.avatarUrl} 
              alt="Avatar" 
              style={{ width: '50px', height: '50px', borderRadius: '50%' }}
            />
          )}
        </div>
      )}
      <button 
        onClick={handleLogout}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#E5533D',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Đăng xuất
      </button>
    </div>
  );
};

export default Dashboard;

