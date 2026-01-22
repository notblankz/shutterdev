export default function AdminLayout({ children, uploadSlot, deleteSlot }) {
    return (
        <div>
            { uploadSlot }
            { deleteSlot }
        </div>
    )
}
