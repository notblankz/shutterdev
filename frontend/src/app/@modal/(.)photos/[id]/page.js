// "/photos/:id - modal view"
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LightboxModal from "./modal";
import PhotoDetail from "@/components/PhotoDetail";
import { Spinner } from "@/components/ui/spinner";

export default function PhotoLightboxPage() {
    const { id } = useParams();
    const [photo, setPhoto] = useState(null);

    useEffect(() => {
        if (!id) return;

        async function load() {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/photos/${id}`
            );
            const data = await res.json();
            setPhoto(data);
        }

        load();
    }, [id]);

    return (
        <LightboxModal id={id}>
            {!photo &&
                <div className="flex h-full items-center justify-center text-neutral-700 gap-1.5">
                    <Spinner className="size-4 lg:size-6 xl:size-8"/>
                </div>}
            {photo && <PhotoDetail photo={photo} />}
        </LightboxModal>
    );
}
