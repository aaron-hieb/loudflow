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
  const [allGear, setAllGear] = useState([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(null);
  // qty picker: { [inventoryItemId]: number }
  const [qtys, setQtys] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.InventoryItem.list(),
      base44.entities.GearItem.list(),
    ]).then(([inv, gear]) => {
      setInventory(inv);
      setAllGear(gear);
    });
  }, [existingItems]);

  // Units out on events = GearItems where status != "unpacked" (returned), grouped by name (case-insensitive)
  const unitsOut = {};
  allGear.forEach((g) => {
    if (g.status !== "unpacked") {
      const key = g.name.toLowerCase();
      unitsOut[key] = (unitsOut[key] || 0) + (g.quantity || 0);
    }
  });

  const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase()));

  const filtered = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (categoryLabels[item.category] || item.category).toLowerCase().includes(search.toLowerCase())
  );

  function getAvailable(item) {
    const out = unitsOut[item.name.toLowerCase()] || 0;
    return Math.max(0, (item.quantity || 0) - out);
  }

  function getQty(item) {
    return qtys[item.id] !== undefined ? qtys[item.id] : Math.min(1, getAvailable(item));
  }

  async function handleAdd(item) {
    const qty = getQty(item);
    if (qty < 1) return;
    setAdding(item.id);
    await base44.entities.GearItem.create({
      event_id: eventId,
      name: item.name,
      category: item.category,
      quantity: qty,
      status: "in_shop",
      notes: item.notes || "",
    });
    setAdding(null);
    onAdded();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
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
            const available = getAvailable(item);
            const qty = getQty(item);
            const outOfStock = available === 0;

            return (
              <div
                key={item.id}
                className="rounded-md px-2 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className={`text-xs ${outOfStock ? "text-destructive" : "text-muted-foreground"}`}>
                      {categoryLabels[item.category] || item.category} · {available} in shop
                    </p>
                  </div>
                </div>
                {!alreadyAdded && !outOfStock && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center border border-border rounded-md overflow-hidden">
                      <button
                        className="px-1.5 py-0.5 text-muted-foreground hover:bg-muted transition-colors text-sm leading-none"
                        onClick={() => setQtys((q) => ({ ...q, [item.id]: Math.max(1, qty - 1) }))}
                      >−</button>
                      <span className="px-2 text-xs font-mono min-w-[2rem] text-center">{qty}</span>
                      <button
                        className="px-1.5 py-0.5 text-muted-foreground hover:bg-muted transition-colors text-sm leading-none"
                        onClick={() => setQtys((q) => ({ ...q, [item.id]: Math.min(available, qty + 1) }))}
                      >+</button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex-1"
                      disabled={adding === item.id}
                      onClick={() => handleAdd(item)}
                    >
                      {adding === item.id ? "..." : <><Plus className="h-3 w-3 mr-1" />Add</>}
                    </Button>
                  </div>
                )}
                {alreadyAdded && (
                  <p className="text-xs text-muted-foreground italic">Already on this event</p>
                )}
                {outOfStock && !alreadyAdded && (
                  <p className="text-xs text-destructive italic">None in shop</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}