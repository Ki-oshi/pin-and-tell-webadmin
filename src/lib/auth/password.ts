import "server-only";

import bcrypt from "bcryptjs";

export async function verifyAdminPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
  if (!plainPassword || !storedHash) {
    return false;
  }

  /*
   * PHP password_hash(PASSWORD_BCRYPT / PASSWORD_DEFAULT)
   * commonly stores bcrypt hashes using $2y$.
   *
   * bcryptjs uses the equivalent $2b$ format.
   */
  let normalizedHash = storedHash;

  if (normalizedHash.startsWith("$2y$")) {
    normalizedHash =
      "$2b$" + normalizedHash.slice(4);
  }

  const isBcrypt =
    normalizedHash.startsWith("$2a$") ||
    normalizedHash.startsWith("$2b$");

  if (!isBcrypt) {
    console.error(
      "[AUTH] Unsupported admin password hash format.",
    );

    return false;
  }

  try {
    return await bcrypt.compare(
      plainPassword,
      normalizedHash,
    );
  } catch (error) {
    console.error(
      "[AUTH] Password verification failed:",
      error,
    );

    return false;
  }
}