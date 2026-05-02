import { fetchGitHubUserData } from "../services/githubService.js";

export const getUserByUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    const userData = await fetchGitHubUserData(username);
    res.status(200).json(userData);
  } catch (error) {
    next(error);
  }
};
