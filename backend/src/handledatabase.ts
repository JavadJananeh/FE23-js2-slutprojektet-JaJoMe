import fs from "fs/promises";
import { User, Comment, Post } from "./userType.js";
import crypto from "crypto";

//database read and write

// dela upp efter users posts comments
// readme file
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
// url id is user.id
async function getUser(id: string): Promise<User | { message: string }> {
	const users = await getUsers();
	const user = users.find((user: User) => user.id == id);
	if (user) return user;
	else return { message: "user not found" };
}
// get login //! funkar men är capslock sensitive
// json format for this is
// {
//     "name": "username",
//     "password": "password"
// }
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
// dont return user.password

// get individuell post //!funkar
// json format for this is:
// {"userId":"user.id or userId",
// "postId":"posts.postId"}
async function getPost(
	userId: string,
	postId: string
): Promise<Post | { message: string }> {
	//!fixa return
	const user = await getUser(userId);
	if ("posts" in user) {
		for (const post of user.posts) {
			if (post.postId === postId) {
				return post;
			}
		}
	}
	return { message: "post not found in user " };
}
// get posts by category //! funkar
// json format for this is:
// {"category":"game1 | game2 | game 3"}
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
// get comments eller posts //! funkar
// json format for this is:
// {
//     "userId": "user.id",
//     "dataType": "posts"| "comments"
// }
async function getUserData(
	userId: string,
	dataType: string
): Promise<Comment[] | Post[] | { message: string }> {
	const user = await getUser(userId);
	if ("comments" in user && "posts" in user) {
		if (dataType === "comments") {
			return user.comments;
		} else if (dataType === "posts") {
			return user.posts;
		}
	}
}

// Post functions
// add new user
//! funkar
// json format for this is:
// {
//     "name":"name",
//     "password":"password",
//     "image":"src for img"
// }
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
//! funkar
// add new post
// json format for this is:
// id in url should be user.id
// {
//     "title": "post title",
//     "bread": "post content",
//     "category": "game1"|"game2"|"game3",
//     "comments": []
// }
async function addPost(userId: string, post: Post): Promise<Post> {
	const newPost: Post = { postId: crypto.randomUUID(), userId, ...post };
	const users = await getUsers();
	for (const user of users) {
		if (user.id == userId) {
			user.posts.push(newPost);
			break;
		}
	}
	await writeDatabase(users);
	return newPost;
}
//add new comment to post. comments array and user.comments array //!funkar
// json format for this is:
// {
//	"userId": "user.id", //?user who comments
//	"postId": "postId",
//	"commentText": "the comment"
//}
async function addComment(
	userId: string,
	postId: string,
	commentText: string
): Promise<Comment> {
	const commentId = crypto.randomUUID();
	const users = await getUsers();
	const userAddingComment = users.find((user) => user.id === userId);
	const postOwner = users.find((user) =>
		user.posts.some((post) => post.postId === postId)
	);
	const post = postOwner.posts.find((post) => post.postId === postId);
	const newComment: Comment = {
		commentId,
		userId,
		postId,
		comment: commentText,
	};
	post.comments.push(newComment);
	userAddingComment.comments.push(newComment);
	await writeDatabase(users);
	return newComment;
}

// delete functions
// delete user from database //! funkar
// url id is user.id
async function deleteUser(id: string): Promise<void> {
	const user = await getUser(id);
	if (!user) throw new Error("User not found");
	const users = await getUsers();
	const updatedDatabase = users.filter((u) => u.id !== id);
	await writeDatabase(updatedDatabase);
}

// delete post from user.posts array // ! funkar
// json format for this is:
// {"userId":"user.id",
// "postId":"postId"}
async function deletePost(userId: string, postId: string): Promise<void> {
	const users = await getUsers();
	const userIndex = users.findIndex((user) => user.id === userId);
	if ("posts" in users[userIndex]) {
		users[userIndex].posts = users[userIndex].posts.filter(
			(post) => post.postId !== postId
		);
		await writeDatabase(users);
		console.log("success");
	}
}

// delete comment from post.comments array and user.comments array //! funkar
// json format for this is:
// {"commentId":"commentId"}
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
	getPost,
};
