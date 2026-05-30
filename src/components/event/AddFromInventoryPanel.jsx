import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const categoryLabels = {
  audio: "Audio", lighting: "Lighting", video: "Video", staging: "Staging",
  power: "Power", power_cabling: "Power Cabling", data_cabling: "Data Cabling",
  rigging: "Rigging", backline: "Backline", other: "Other",
};

export default function AddFromInventoryPanel({ eventId, existingItems, onAdded }) {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    base44.entities.InventoryItem.list().then(setInventory);
  }, []);

  const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase()));

  const filtered = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (categoryLabels[item.category] || item.category).toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(item) {
    setAdding(item.id);
    await base44.entities.GearItem.create({
      event_id: eventId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      status: "in_shop",
      notes: item.notes || "",
    });
    setAdding(null);
    onAdded();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Master Inventory</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search gear..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-6 w-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No items found</p>
          </div>
        ) : (
          filtered.map((item) => {
            const alreadyAdded = existingNames.has(item.name.toLowerCase());
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{categoryLabels[item.category] || item.category} · Qty {item.quantity}</p>
                </div>
                <Button
                  size="sm"
                  variant={alreadyAdded ? "ghost" : "outline"}
                  className="h-7 text-xs shrink-0"
                  disabled={alreadyAdded || adding === item.id}
                  onClick={() => handleAdd(item)}
                >
                  {alreadyAdded ? "Added" : adding === item.id ? "..." : <><Plus className="h-3 w-3 mr-1" />Add</>}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}