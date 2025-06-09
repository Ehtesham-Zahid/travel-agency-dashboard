// // import { ID, OAuthProvider, Query } from "appwrite";
// // import { account, appwriteConfig, database } from "./client";
// // import { redirect } from "react-router";

// // export const loginWithGoogle = async () => {
// //   try {
// //     await account.createOAuth2Session(OAuthProvider.Google);
// //   } catch (error) {
// //     console.log("loginWithGoogle", error);
// //   }
// // };

// // export const getUser = async () => {
// //   try {
// //     const user = await account.get();

// //     if (!user) return redirect("/sign-in");

// //     const { documents } = await database.listDocuments(
// //       appwriteConfig.databaseId,
// //       appwriteConfig.userCollectionId,
// //       [
// //         Query.equal("accountId", user.$id),
// //         Query.select(["name", "email", "imageUrl", "joinedAt", "accountId"]),
// //       ]
// //     );
// //   } catch (error) {
// //     console.error(error);
// //   }
// // };

// // export const logoutUser = async () => {
// //   try {
// //     await account.deleteSession("current");
// //     return true;
// //   } catch (error) {
// //     console.log("logoutUser error:", error);
// //     return false;
// //   }
// // };

// // export const getGooglePicture = async () => {
// //   try {
// //     // Get the current session
// //     const session = await account.getSession("current");

// //     // Get the OAuth token
// //     const oAuthToken = session.providerAccessToken;

// //     if (!oAuthToken) {
// //       console.log("No OAuth token available!");
// //       return null;
// //     }

// //     const response = await fetch(
// //       `https://people.googleapis.com/v1/people/me?personFields=photos`,
// //       {
// //         headers: {
// //           Authorization: `Bearer ${oAuthToken}`,
// //         },
// //       }
// //     );

// //     if (!response.ok) {
// //       console.log("Failed to fetch Google profile picture!");
// //       return null;
// //     }

// //     const data = await response.json();

// //     const photoUrl =
// //       data.photos && data.photos.length > 0 ? data.photos[0].url : null;

// //     return photoUrl;
// //   } catch (error) {
// //     console.log("getGooglePicture error:", error);
// //   }
// // };

// // export const storeUserData = async () => {
// //   try {
// //     const user = await account.get();

// //     if (!user) return null;

// //     // Check if the user already exists in the database
// //     const { documents } = await database.listDocuments(
// //       appwriteConfig.databaseId,
// //       appwriteConfig.userCollectionId,
// //       [Query.equal("accountId", user.$id)]
// //     );

// //     if (documents.length > 0) return documents[0];

// //     // Get profile picture from Google
// //     const imageUrl = await getGooglePicture();

// //     // Create a new user in the database
// //     const newUser = await database.createDocument(
// //       appwriteConfig.databaseId,
// //       appwriteConfig.userCollectionId,
// //       ID.unique(),
// //       {
// //         accountId: user.$id,
// //         email: user.email,
// //         name: user.name,
// //         imageUrl: imageUrl || "",
// //         joinedAt: new Date().toISOString(),
// //       }
// //     );

// //     return newUser;
// //   } catch (error) {
// //     console.log("storeUserData error:", error);
// //     return null;
// //   }
// // };

// // export const getExistingUser = async () => {
// //   try {
// //     const user = await account.get();

// //     if (!user) return null;

// //     const { documents } = await database.listDocuments(
// //       appwriteConfig.databaseId,
// //       appwriteConfig.userCollectionId,
// //       [Query.equal("accountId", user.$id)]
// //     );

// //     if (documents.length === 0) return null;

// //     return documents[0];
// //   } catch (error) {
// //     console.log("getExistingUser error:", error);
// //     return null;
// //   }
// // };

import { ID, OAuthProvider, Query } from "appwrite";
import { account, database, appwriteConfig } from "~/appwrite/client";
import { redirect } from "react-router";

export const getExistingUser = async (id: string) => {
  try {
    const { documents, total } = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", id)]
    );
    return total > 0 ? documents[0] : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

export const storeUserData = async () => {
  try {
    const user = await account.get();
    if (!user) throw new Error("User not found");

    // Check if user already exists
    const existingUser = await getExistingUser(user.$id);
    if (existingUser) {
      return existingUser;
    }

    const { providerAccessToken } = (await account.getSession("current")) || {};
    const profilePicture = providerAccessToken
      ? await getGooglePicture(providerAccessToken)
      : null;

    const createdUser = await database.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: user.$id,
        email: user.email,
        name: user.name,
        imageUrl: profilePicture,
        joinedAt: new Date().toISOString(),
        tripsCreated: 0, // Initialize tripsCreated count
      }
    );

    return createdUser;
  } catch (error) {
    console.error("Error storing user data:", error);
    return null;
  }
};

const getGooglePicture = async (accessToken: string) => {
  try {
    const response = await fetch(
      "https://people.googleapis.com/v1/people/me?personFields=photos",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error("Failed to fetch Google profile picture");

    const { photos } = await response.json();
    return photos?.[0]?.url || null;
  } catch (error) {
    console.error("Error fetching Google picture:", error);
    return null;
  }
};

export const loginWithGoogle = async () => {
  try {
    account.createOAuth2Session(
      OAuthProvider.Google,
      `${window.location.origin}/dashboard`,
      `${window.location.origin}/sign-in?error=auth_failed`
    );
  } catch (error) {
    console.error("Error during OAuth2 session creation:", error);
  }
};

export const logoutUser = async () => {
  try {
    await account.deleteSession("current");
  } catch (error) {
    console.error("Error during logout:", error);
  }
};

export const getUser = async () => {
  try {
    const user = await account.get();
    if (!user) return redirect("/sign-in");

    const { documents } = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [
        Query.equal("accountId", user.$id),
        Query.select([
          "name",
          "email",
          "imageUrl",
          "joinedAt",
          "accountId",
          "tripsCreated",
        ]),
      ]
    );

    if (documents.length === 0) {
      // If user doesn't exist in database, create them
      const newUser = await storeUserData();
      return newUser || redirect("/sign-in");
    }

    return documents[0];
  } catch (error) {
    console.error("Error fetching user:", error);
    return redirect("/sign-in");
  }
};

export const getAllUsers = async (limit: number, offset: number) => {
  try {
    const { documents: users, total } = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.limit(limit), Query.offset(offset)]
    );

    if (total === 0) return { users: [], total };

    return { users, total };
  } catch (error) {
    console.error("Error fetching all users:", error);
    return { users: [], total: 0 };
  }
};
