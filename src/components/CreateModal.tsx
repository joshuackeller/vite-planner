import { AppContext } from "@/App";
import { FormEvent, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Period } from "@/lib/DB";

const CreateModal = ({
  day,
  setDay,
  period,
  refresh,
}: {
  day: Date | null;
  setDay: (day: Date | null) => void;
  period: Period;
  refresh: () => void;
}) => {
  const { db } = useContext(AppContext);

  const [name, setName] = useState<string>("");
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!day) return;
    if (!name) {
      toast({
        variant: "destructive",
        title: "Name is required",
        description: "Name is required to create a new item",
      });
      return;
    }
    db.create(name, day, period);
    refresh();
    setDay(null);
    setName("");
  };

  if (!day) return null;
  return (
    <Dialog open={!!day} onOpenChange={() => setDay(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Item</DialogTitle>
          <DialogDescription>
            Add an item to your list of things to do today.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} autoComplete="off">
          <div>
            <Label htmlFor="task_name" className="text-right">
              Name
            </Label>
            <Input
              id="task_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              data-bwignore
            />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateModal;
