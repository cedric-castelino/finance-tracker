import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';

function Register() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [conPassword, setConPassword] = useState('');
    const [error, setError] = useState(''); 
    const navigate = useNavigate();

    const register = async () => {
        if (firstName === '' || lastName === '' || email === '' || password === '' || conPassword === '') {
            setError('Input fields cannot be empty');
            return;
        }
        if (conPassword !== password) {
            setError("Passwords must match");
            return;
        }
        if (!checkEmailValidity(email)) {
            setError("Invalid email entered");
            return;
        }

        try {
            const response = await axios.post('http://localhost:3000/register', {
                email: email,
                firstName: firstName, 
                lastName: lastName, 
                password: password, 
                transactions: [],
                firstTimeSetup: false,
                sources: []
            })

            localStorage.setItem('token', response.data.insertedId);
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setConPassword('');
            setError('');
            navigate('/home');
        } catch (err) {
            setError(err.response.data.error);
        }      
    };

    function checkEmailValidity (event) {
        const emailRegex = /^.+@.+\..+$/;
        return emailRegex.test(event);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            register();
        }
    }

    return (
        <>
            <div className="flex items-center justify-center min-h-screen">
            <fieldset className="fieldset w-sm bg-base-200 border border-base-300 rounded-box p-4">
                <h1 className="text-3xl font-bold text-center">Register</h1>
                <hr className="w-full border border-gray-300 my-4 mb-2" />
                <div className="join gap-3">
                    <div className="join join-vertical">
                        <label className="fieldset-label text-slate-900">First Name</label>
                        <input value={firstName} onChange={e => setFirstName(e.target.value)} onKeyDown={handleKeyPress} type="text" id="first_name" className="input rounded-md" placeholder="First Name" />
                    </div>
                    <div className="join join-vertical">
                        <label className="fieldset-label text-slate-900">Last Name</label>
                        <input value={lastName} onChange={e => setLastName(e.target.value)} onKeyDown={handleKeyPress} type="text" id="last_name" className="input rounded-md" placeholder="Last Name" />
                    </div>
                </div>

                
                <label className="fieldset-label text-slate-900">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyPress} type="email" className="input w-90" placeholder="Email" />
                
                <label className="fieldset-label text-slate-900">Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyPress} type="password" className="input w-90" placeholder="Password" autoComplete="new-password"/>

                <label className="fieldset-label text-slate-900">Confirm Password</label>
                <input value={conPassword} onChange={e => setConPassword(e.target.value)} onKeyDown={handleKeyPress} type="password" className="input w-90" placeholder="Confirm Password" autoComplete="new-password"/>

                {error && (
                <div role="alert" className="alert alert-warning mt-2 mb-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                </div>
                )}

                <button onClick={register} className="btn btn-secondary md:btn-md flex-1 mt-2" name="login-button">Register</button>
                <div className="flex gap-x-1 w-full mt-3"> 
                Already have an account? <Link to="/login" className="underline text-secondary">Login</Link>
                </div>
            </fieldset>
            </div>
        </>
      )
  }
  
  export default Register