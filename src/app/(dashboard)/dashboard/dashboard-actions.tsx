"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { deleteStatement } from "@/lib/actions/statements";
import { useRouter } from "next/navigation";

export function DeleteStatementButton({
  statementId,
  label,
}: {
  statementId: string;
  label: string;
}) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [alsoDeleteInvoices, setAlsoDeleteInvoices] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteStatement(statementId, {
      deleteLinkedInvoices: alsoDeleteInvoices,
    });
    if (result.error) {
      toast.error(`Eroare: ${result.error}`);
    } else {
      toast.success(
        alsoDeleteInvoices
          ? "Extras de cont si facturile asociate au fost sterse"
          : "Extras de cont sters"
      );
      router.refresh();
    }
    setDeleting(false);
    setShowDialog(false);
    setAlsoDeleteInvoices(false);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setShowDialog(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Sterge extras</TooltipContent>
      </Tooltip>

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setAlsoDeleteInvoices(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sterge extras de cont?</DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa stergi extrasul &quot;{label}&quot;?
              Toate tranzactiile asociate vor fi sterse.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 py-2 px-1">
            <Checkbox
              id="dashboard-also-delete-invoices"
              checked={alsoDeleteInvoices}
              onCheckedChange={(checked) =>
                setAlsoDeleteInvoices(checked === true)
              }
            />
            <label
              htmlFor="dashboard-also-delete-invoices"
              className="text-sm font-medium leading-none cursor-pointer select-none"
            >
              Sterge si toate facturile asociate acestui extras
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setAlsoDeleteInvoices(false);
              }}
              disabled={deleting}
            >
              Anuleaza
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin mr-2" />}
              Sterge definitiv
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
