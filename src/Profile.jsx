import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Profile() {
    const navigate = useNavigate();
    const id = localStorage.getItem('token');

    function logout () {
        localStorage.removeItem('token');
        localStorage.removeItem('firstName');
        navigate("/")
    };

    function showDeleteAccount () {
        document.getElementById("delete_account_transaction").showModal();
    };

    async function deleteAccount() {
        try {
            await axios.delete(`http://localhost:3000/users/${id}`);
            localStorage.removeItem('token');
            localStorage.removeItem('firstName');
            navigate("/")
        } catch (err) {
            console.log(err);
        }
    };


    return (
        <>
            <button className="btn btn-outline btn-error" onClick={logout}>Logout</button>
            <button className="btn btn-error" onClick={showDeleteAccount}>Delete Account</button>
            <dialog id="delete_account_transaction" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Delete Account</h3>
                    <p className="py-4">Confirm that you would like to delete your account and all stored data. You cannot retrieve this once it is deleted.</p>
                    <div className="modal-action">
                    <form method="dialog">
                        <button className="btn mr-4 btn-error btn-soft" onClick={deleteAccount}>Delete</button>
                        <button className="btn">Cancel</button>
                    </form>
                    </div>
                </div>
            </dialog>
        </>
      )
  }
  
  export default Profile