// Shared mapping from the db layer's thrown Error("not_found"|"locked"|"invalid_state")
// to the HTTP response every mutating action route should return.
export function mapActionError(err: unknown): { status: 404 | 409 | 400; body: { error: string; message: string } } | null {
  if (err instanceof Error) {
    if (err.message === "not_found") return { status: 404, body: { error: "not_found", message: "Resource not found" } };
    if (err.message === "locked")
      return { status: 409, body: { error: "locked", message: "Document is Paid/Cleared and is read-only" } };
    if (err.message === "invalid_state")
      return { status: 400, body: { error: "invalid_state", message: "Action is not valid for the document's current status" } };
  }
  return null;
}
