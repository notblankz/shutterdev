"use client";

import { useEffect, useState } from "react";
import LoginDialog from "./LoginDialog";
import { Spinner } from "@/components/ui/spinner";

export default function AdminLayout({ children, uploadSlot, deleteSlot }) {
    const [authenticated, setAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            const res = await fetch("/api/admin/me", {
                credentials: "include",
            });

            if (res.ok) {
                setAuthenticated(true);
            }

            setCheckingAuth(false);
        }

        checkAuth();
    }, []);

    if (checkingAuth) {
        return (
            <div className="flex justify-center items-center text-xl min-h-screen text-neutral-700">
                <Spinner className="size-6" />
                <span className="ml-3 pb-1">Loading Secret Page...</span>
            </div>
        )
    }

    if (!authenticated) {
        return <LoginDialog open onSuccess={() => setAuthenticated(true)} />;
    }

    return (
        <div>
            {children}
            {uploadSlot}
            {deleteSlot}
        </div>
    );
}
