import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { CreateMultisigForm } from "@/components/multisig/create-multisig-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function NewMultisigPage() {
  return (
    <div className="mx-auto w-full max-w-[700px]">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-secondary"
      >
        <ArrowLeftIcon className="size-4" />
        Back To Multisigs
      </Link>

      <Card className="[--card-spacing:--spacing(0)]">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-6">
          <div className="max-w-lg">
            <CardTitle className="text-2xl">Create Multisig</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Add owners and define the signing policy for this private account.
            </p>
          </div>
          <Badge variant="secondary" className="h-8 px-3">
            <ShieldCheckIcon className="size-4" />
            Private Account
          </Badge>
        </div>
        <Separator />
        <CardContent className="px-6 py-7">
          <CreateMultisigForm />
        </CardContent>
      </Card>
    </div>
  );
}
