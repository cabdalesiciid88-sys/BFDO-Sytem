/**
 * Thrown by permission helpers when a user is authenticated but not
 * authorized for the specific resource/action. Feature code should catch
 * this at the route boundary and render `notFound()` rather than leaking
 * "this exists but you can't see it" — guessing another project's ID
 * should look identical to it not existing (spec 5, hard rule 4).
 */
export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
