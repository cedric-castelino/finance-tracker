import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); 
    const navigate = useNavigate();

    useEffect(() => {
        if (localStorage.getItem("token")) {
            navigate('/home');
        }
    }, [navigate]);

    const login = async () => {
        try {
            const response = await axios.post('http://localhost:3000/login', {
                email: email,
                password: password
            })
            console.log(response);
            localStorage.setItem('token', response.data.user._id);
            setEmail('');
            setPassword('');
            setError('');
            navigate('/home');
        } catch (err) {
            setError(err.response.data.error);
        }      
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            login();
        }
    }

    return (
        <>
            <div className="flex items-center justify-center min-h-screen">
            <fieldset className="fieldset w-xs bg-base-200 border border-base-300 rounded-box p-4">
                <h1 className="text-3xl font-bold text-center">Login</h1>
                <hr className="w-full border border-gray-300 my-4 mb-2" />
                
                <label className="fieldset-label text-slate-900">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyPress} type="email" className="input" placeholder="Email" autoComplete="email"/>
                
                <label className="fieldset-label text-slate-900">Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyPress} type="password" className="input" placeholder="Password" autoComplete="current-password"/>

                {error && (
                <div role="alert" className="alert alert-warning mt-2 mb-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                </div>
                )}

                <button onClick={login} className="btn btn-secondary md:btn-md flex-1 mt-2" name="login-button">Login</button>
                <div className="flex gap-x-1 w-full mt-3"> 
                Don't have an account? <Link to="/register" className="underline text-secondary">Register</Link>
                </div>
            </fieldset>
            </div>
        </>
      )
  }
  
  export default Login