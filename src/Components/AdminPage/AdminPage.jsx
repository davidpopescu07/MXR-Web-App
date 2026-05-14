import React from "react";
import "./AdminPage.css";

const AdminPage = ({ currentUser }) => {
    if (!currentUser) {
        return (
            <div className="admin-page">
                <div className="admin-panel">
                    <h1>Admin</h1>
                    <p> you might be an admin but you don't hold the power !!!</p>
                </div>
            </div>
        );
    }

    if (currentUser.role !== "ADMIN") {
        return (
            <div className="admin-page">
                <div className="admin-panel">
                    <h1>Admin</h1>
                    <p>Admin access required</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-panel">
                <h1>Admin</h1>
                <p>Signed in as {currentUser.username}.</p>
                <p>you might be an admin but you don't hold the power !!!.</p>
            </div>
        </div>
    );
};

export default AdminPage;
