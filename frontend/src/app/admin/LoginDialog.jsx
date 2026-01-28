"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

export default function LoginDialog({ open, onSuccess }) {
    const [adminPassword, setAdminPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setLoading(true);

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: adminPassword }),
            credentials: "include"
        });

        setLoading(false);

        if (!res.ok) {
            toast.warning("Incorrect Password", { position: "top-right" })
            setAdminPassword("")
            return;
        }

        onSuccess();
    }

    return (
        <Dialog open={open}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="mb-1 text-l md:text-2xl">Nice Try. Now Authenticate.</DialogTitle>
                    <DialogDescription>Enter the Admin Password</DialogDescription>
                </DialogHeader>

                <Input
                    type="password"
                    placeholder="Go Ahead..."
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                />

                <DialogFooter>
                    <Button variant="link" asChild >
                        <Link href="/" >Give Up</Link>
                    </Button>
                    <Button onClick={handleLogin} disabled={loading || (adminPassword ? false : true)} className="flex items-center justify-center ">
                        {loading && <Spinner data-icon="inline-start" />}
                        <span className="pb-0.5" >{loading ? "Logging In..." : "Login"}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
