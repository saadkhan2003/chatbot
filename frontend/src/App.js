import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  AppBar, 
  Toolbar, 
  IconButton,
  CircularProgress,
  useMediaQuery,
  Alert,
  Snackbar
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

// Create a theme instance with professional colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#0F172A', // Dark blue for primary
      light: '#1E293B',
      dark: '#020617',
    },
    secondary: {
      main: '#3B82F6', // Bright blue for accents
      light: '#60A5FA',
      dark: '#2563EB',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    error: {
      main: '#EF4444',
    },
    success: {
      main: '#10B981',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.025em',
      backgroundImage: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    body1: {
      fontSize: '0.975rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 12,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontSize: '0.95rem',
          padding: '10px 24px',
          transition: 'all 0.3s ease',
          backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
          color: '#FFFFFF',
          '@media (max-width: 600px)': {
            padding: '8px 16px',
            fontSize: '0.9rem',
          },
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)',
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '0 12px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          transition: 'all 0.3s ease',
          backgroundImage: 'none',
          '@media (max-width: 600px)': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.3s ease',
            backgroundColor: '#FFFFFF',
            '@media (max-width: 600px)': {
              fontSize: '0.9rem',
            },
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              '& > fieldset': {
                borderColor: '#3B82F6',
              },
            },
          },
        },
      },
    },
  },
});

function App() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId] = useState(uuidv4()); // Generate a unique ID for the user session
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  const messagesEndRef = useRef(null);
  
  // Scroll to the bottom of the chat when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Check if backend is available
  useEffect(() => {
    fetch('/api/health')
      .then(response => {
        if (!response.ok) {
          throw new Error('Backend server is not responding');
        }
        return response.json();
      })
      .catch(error => {
        console.error('Backend connection error:', error);
        setErrorMessage('Could not connect to the backend server. Please make sure it\'s running.');
        setOpenSnackbar(true);
      });
  }, []);
  
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };
  
  const sendMessage = async () => {
    if (!message.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          user_id: userId
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Server error');
      }
      
      const data = await response.json();
      
      const aiMessage = { role: 'assistant', content: data.message };
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Network error:', error);
      
      let errorMsg = 'Network error. Please check your connection and try again.';
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        errorMsg = 'Could not connect to the server. Please make sure the backend is running.';
      }
      
      setChatHistory(prev => [...prev, { 
        role: 'system', 
        content: errorMsg
      }]);
      
      setErrorMessage(errorMsg);
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const clearChat = async () => {
    try {
      await fetch(`/api/clear/${userId}`, {
        method: 'POST',
      });
      setChatHistory([]);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };
  
  return (
    <ThemeProvider theme={theme}>
      <Box className="chat-container bg-pattern" sx={{ bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0} color="inherit">
          <Toolbar 
            sx={{ 
              px: { xs: 1.5, sm: 4 }, 
              py: { xs: 1, sm: 1.5 },
              minHeight: { xs: '56px', sm: '64px' }
            }}
          >
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.02)',
                }
              }}
            >
              <Box 
                className="hover-effect"
                sx={{ 
                  width: 45, 
                  height: 45, 
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SmartToyIcon sx={{ fontSize: 26, color: '#fff' }} />
              </Box>
              <Box>
                <Typography 
                  variant="h6" 
                  className="highlight-text"
                  sx={{ 
                    fontSize: { xs: '1.2rem', sm: '1.35rem' },
                    fontWeight: 700,
                  }}
                >
                  AI Innovate Solutions
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    display: { xs: 'none', sm: 'block' },
                    mt: 0.5,
                    fontWeight: 500
                  }}
                >
                  Your AI Assistant
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton 
              className="button-animate"
              onClick={clearChat}
              sx={{
                borderRadius: '12px',
                p: 1.2,
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                }
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Container 
          maxWidth="md" 
          sx={{ 
            flexGrow: 1, 
            py: { xs: 2, sm: 3 }, 
            px: { xs: 1, sm: 3 },
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <Paper 
            elevation={0} 
            className="glass-effect"
            sx={{ 
              flexGrow: 1, 
              p: { xs: 1.5, sm: 3 }, 
              mb: { xs: 1, sm: 2 }, 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'grey.200',
              maxHeight: { xs: 'calc(100vh - 160px)', sm: 'calc(100vh - 180px)' },
              position: 'relative',
            }}
          >
            {chatHistory.length === 0 ? (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexGrow: 1, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: 'text.secondary',
                  gap: 3,
                  p: 4,
                  textAlign: 'center'
                }}
              >
                <Box 
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '24px',
                    backgroundColor: 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 40, color: '#fff' }} />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 600,
                    letterSpacing: '-0.02em'
                  }}
                >
                  Welcome to AI Innovate Solutions
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    maxWidth: '500px',
                    color: 'text.secondary',
                    lineHeight: 1.7
                  }}
                >
                  I'm your AI assistant, ready to help with AI app development, 
                  chatbot solutions, and machine learning services. How can I assist you today?
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {chatHistory.map((msg, index) => (
                  <Box 
                    key={index}
                    className="message-bubble"
                    sx={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      position: 'relative',
                      ml: msg.role !== 'user' ? { xs: 4, sm: 5 } : 0, // Add margin for non-user messages
                    }}
                  >
                    {msg.role !== 'user' && (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          backgroundColor: 'secondary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'absolute',
                          left: { xs: -36, sm: -40 }, // Adjust left position
                          top: 0,
                        }}
                      >
                        <SmartToyIcon sx={{ fontSize: 18, color: '#fff' }} />
                      </Box>
                    )}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        maxWidth: isMobile ? '90%' : '70%',
                        backgroundColor: msg.role === 'user' ? 'primary.main' : 
                                       msg.role === 'system' ? 'error.light' : 'background.paper',
                        color: msg.role === 'user' ? '#fff' : 
                               msg.role === 'system' ? '#fff' : 'text.primary',
                        borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                        border: msg.role === 'user' ? 'none' : '1px solid',
                        borderColor: msg.role === 'system' ? 'error.main' : 'grey.200',
                        mr: msg.role === 'user' ? { xs: 0, sm: 1 } : 0,
                        boxShadow: msg.role === 'user' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        }
                      }}
                    >
                      {msg.role === 'user' ? (
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                            letterSpacing: '-0.01em'
                          }}
                        >
                          {msg.content}
                        </Typography>
                      ) : (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.7,
                                  letterSpacing: '-0.01em',
                                  '& strong': {
                                    fontWeight: 600,
                                    color: msg.role === 'system' ? '#fff' : 'primary.main'
                                  }
                                }}
                              >
                                {children}
                              </Typography>
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </Paper>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Box>
            )}
          </Paper>
          
          <Paper
            elevation={0}
            className="glass-effect hover-effect"
            sx={{ 
              display: 'flex', 
              gap: { xs: 1, sm: 2 },
              p: { xs: 1.5, sm: 2 },
              mx: { xs: 0, sm: 3 },
              mb: { xs: 1, sm: 2 },
              borderRadius: { xs: 2, sm: 3 },
              border: '1px solid',
              borderColor: 'grey.200',
              backgroundColor: 'background.paper',
              position: 'sticky',
              bottom: 0,
              zIndex: 2,
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              disabled={loading}
              sx={{ 
                "& .MuiOutlinedInput-root": {
                  backgroundColor: 'background.paper',
                  transition: 'all 0.2s ease',
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  '&:hover': {
                    backgroundColor: 'background.paper',
                    '& > fieldset': {
                      borderColor: 'secondary.main',
                    }
                  },
                  '&.Mui-focused': {
                    '& > fieldset': {
                      borderColor: 'secondary.main',
                      borderWidth: '2px',
                    }
                  }
                }
              }}
            />
            <Button 
              variant="contained" 
              color="primary"
              className="button-animate"
              endIcon={loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SendIcon sx={{ fontSize: { xs: 20, sm: 20 } }} />
              )}
              onClick={sendMessage}
              disabled={!message.trim() || loading}
              sx={{ 
                minWidth: { xs: '48px', sm: '130px' },
                width: { xs: '48px', sm: 'auto' },
                height: { xs: '48px', sm: '100%' },
                p: { xs: '12px', sm: '10px 24px' },
                borderRadius: { xs: '12px', sm: '12px' },
                alignSelf: 'center',
                transition: 'all 0.2s ease',
                color: '#FFFFFF',
                '& .MuiButton-endIcon': {
                  ml: { xs: 0, sm: 1 },
                  mr: { xs: 0 },
                },
                '& .MuiButton-startIcon': {
                  ml: { xs: 0, sm: 1 },
                },
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)',
                  color: '#FFFFFF',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.7)',
                }
              }}
            >
              {loading ? (
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Sending...</Box>
              ) : (
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Send</Box>
              )}
            </Button>
          </Paper>
        </Container>
        
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: { xs: 1.5, sm: 2 }, 
            px: { xs: 1.5, sm: 2 },
            mt: 'auto', 
            borderTop: '1px solid',
            borderColor: 'grey.200',
            backgroundColor: 'background.paper',
            opacity: 0.9,
            backgroundImage: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.9))',
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: 'inherit'
            }}
          >
            © {new Date().getFullYear()} AI Innovate Solutions
          </Typography>
        </Box>

        <Snackbar 
          open={openSnackbar} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{
            '& .MuiSnackbarContent-root': {
              '@media (max-width: 600px)': {
                margin: '8px',
                width: 'calc(100% - 16px)',
              },
            },
          }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity="error" 
            sx={{ 
              width: '100%',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            {errorMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;