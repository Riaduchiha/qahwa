import KdsPage from "../../(protected)/kds/page";
import CheckOutButton from "@/components/qahwa/CheckOutButton";
import PosteShell from "@/components/qahwa/PosteShell";

export default function PosteKdsPage() {
  return (
    <PosteShell>
      <KdsPage />
      <CheckOutButton />
    </PosteShell>
  );
}