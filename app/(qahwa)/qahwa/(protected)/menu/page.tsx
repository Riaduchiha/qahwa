import MenuManager from "@/components/qahwa/MenuManager";

export default function QahwaMenuAdminPage() {
  return (
    <div>
      <h1 className="font-display text-2xl uppercase text-qahwa-text">
        Gestion du menu
      </h1>
      <p className="mt-1 text-sm text-qahwa-muted">
        Modifie le nom, la description, le prix, ou masque un produit -
        les champs se sauvegardent automatiquement.
      </p>
      <div className="mt-6">
        <MenuManager />
      </div>
    </div>
  );
}
