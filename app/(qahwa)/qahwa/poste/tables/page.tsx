import TablesPage from "../../(protected)/tables/page";
import CheckOutButton from "@/components/qahwa/CheckOutButton";
import PosteShell from "@/components/qahwa/PosteShell";

export default function PosteTablesPage() {
  return (
    <PosteShell>
      <div className="px-4 pb-24 pt-5">
        <TablesPage />
      </div>

      <CheckOutButton />
    </PosteShell>
  );
}