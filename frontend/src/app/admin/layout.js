export default function AdminLayout({ children, upload, deleteSlot }) {
    return (
        <div>
            { upload }
            { deleteSlot }
        </div>
    )
}
