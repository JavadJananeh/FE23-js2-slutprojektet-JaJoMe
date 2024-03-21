import fs from "fs/promises";
import { User, Comment, Post } from "./userType.js";
import crypto from "crypto";
import { error } from "console";
//database read and write
async function readDatabase() {
  const rawDbBuffer: Buffer = await fs.readFile("./src/db.json");
  const rawDb: string = rawDbBuffer.toString("utf-8");
  return JSON.parse(rawDb);
}
async function writeDatabase(users: User[]): Promise<void> {
  const db = { users };
  await fs
    .writeFile("./src/db.json", JSON.stringify(db, null, 2))
    .then(() => {
      console.log("database updated correctly");
    })
    .catch((error) => {
      console.error("error writing database", error);
    });
}
//
// get functions
// get all users
async function getUsers(): Promise<User[]> {
  const db = await readDatabase();
  return db.users;
}
// get individuel user
async function getUser(id: string): Promise<User | { message: string }> {
  const users = await getUsers();
  const user = users.find((user: User) => user.id == id);
  if (user) return user;
  else return { message: "user not found" };
}
// get login //! funkar men är capslock sensitive
async function logIn(
  userName: string,
  userPassword: string
): Promise<User | { message: string }> {
  const users = await getUsers();
  for (const user of users) {
    console.log(user);

    if (user.name === userName && user.password === userPassword) {
      console.log(user);
      return user;
    }
  }
  return { message: "user not found" };
}
// get posts with same category //! behöver testas
async function getCategory(
  category: Array<"game1" | "game2" | "game3">
): Promise<Post[]> {
  const users = await getUsers();
  const matchingPosts: Post[] = [];
  for (const user of users) {
    for (const post of user.posts) {
      if (post.category === category) {
        matchingPosts.push(post);
      }
    }
  }
  return matchingPosts;
}
// get comments eller posts //! behöver testas
async function getUserData(
  user: User,
  data: "comments" | "posts"
): Promise<Comment[] | Post[] | { message: string }> {
  const foundUser = await getUser(user.id);
  if ("comments" in foundUser && "posts" in foundUser) {
    return data === "comments" ? foundUser.comments : foundUser.posts;
  } else return { message: "no data found" };
}

//
// Post functions
// ! denna funkar som den ska
// add new user
async function addUser(user: User): Promise<User> {
  const users = await getUsers();

  const existingName = users.find(
    (existingName) => existingName.name === user.name
  );
  if (existingName) {
    throw new Error("User with that name already exists");
  }

  const id = crypto.randomUUID();
  const newUser: User = {
    id,
    name: user.name,
    password: user.password,
    image: user.image,
    admin: false,
    comments: [],
    posts: [],
  };
  users.push(newUser);
  await writeDatabase(users);
  return newUser;
}

// Patch functions
//! borde funka men gör inte det??? kolla console så förstår ni :/
// add new post
async function addPost(userId: string, post: Post): Promise<Post> {
  const user = await getUser(userId);
  //   console.log(user);
  const newPost: Post = { postId: crypto.randomUUID(), userId, ...post };

  if ("posts" in user) {
    user.posts.push(newPost);
    console.log(user);
    // console.log(newPost);

    await writeDatabase(await getUsers());
    return newPost;
  } else throw new Error("posts in user not found");
}
//! denna borde funka men kan inte testa riktigt utan addPost function
//add new comment to post. comments array and user.comments array
async function addComment(
  userId: string,
  postId: string,
  comment: Comment
): Promise<Comment> {
  const user = await getUser(userId);
  if (!("id" in user && "comments" in user && "posts" in user)) {
    throw new Error("User not found");
  }
  const userComment: Comment = { userId, postId, ...comment };
  const post = user.posts.find((post) => post.postId === postId);
  if (!post) {
    throw new Error("Post not found");
  }
  user.comments.push(userComment);
  post.comments.push(userComment);
  await writeDatabase(await getUsers());
  return userComment;
}

// delete functions
// delete user from database
async function deleteUser(id: string): Promise<void> {
  const user = await getUser(id);
  if (!user) throw new Error("User not found");
  const users = await getUsers();
  const updatedDatabase = users.filter((u) => u.id !== id);
  await writeDatabase(updatedDatabase);
}
// ! behöver testas
// delete post from user.posts array
async function deletePost(userId: string, postId: string): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");
  if (!("posts" in user)) {
    throw new Error("User posts not found");
  }
  const postIndex = user.posts.findIndex((post) => post.postId === postId);
  if (postIndex === -1) throw new Error("Post not found");
  user.posts.splice(postIndex, 1);
  await writeDatabase(await getUsers());
}
//! behöver testas
// delete comment from post.comments array and user.comments array
async function deleteComment(commentId: string): Promise<void> {
  const users = await getUsers();
  let commentDeleted = false;

  for (const user of users) {
    const commentIndex = user.comments.findIndex(
      (comment) => comment.commentId === commentId
    );
    if (commentIndex !== -1) {
      user.comments.splice(commentIndex, 1);
      commentDeleted = true;
    }
    for (const post of user.posts) {
      const postCommentIndex = post.comments.findIndex(
        (comment) => commentId === comment.commentId
      );

      if (postCommentIndex !== -1) {
        post.comments.splice(postCommentIndex, 1);
        commentDeleted = true;
      }
    }
  }
  if (commentDeleted === true) {
    await writeDatabase(users);
    return;
  }
  throw new Error("Comment not found");
}

export {
  readDatabase,
  writeDatabase,
  getUser,
  getUsers,
  getUserData,
  addUser,
  addComment,
  addPost,
  deleteUser,
  deletePost,
  deleteComment,
  getCategory,
  logIn,
};
