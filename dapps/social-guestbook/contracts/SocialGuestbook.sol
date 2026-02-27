// Canonical deployed source for MIDL staging deployment
// Do not edit without redeploy + reverify
// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

contract SocialGuestbook {

    // ─── Owner ───────────────────────────────────────────────
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyRegistered() {
        require(addressToProfile[msg.sender].exists, "Must be registered");
        _;
    }

    modifier postExists(uint256 _postId) {
        require(posts[_postId].exists, "Post does not exist");
        _;
    }

    // ─── Profile Storage ─────────────────────────────────────
    struct Profile {
        string username;
        bool   exists;
    }

    mapping(address => Profile) public addressToProfile;
    mapping(string  => address) public usernameToAddress;

    event UserRegistered(address indexed user, string username);

    // ─── Post Storage ────────────────────────────────────────
    struct Post {
        uint256 id;
        address author;
        string  content;
        uint256 timestamp;
        uint256 likeCount;
        bool    exists;
    }

    mapping(uint256 => Post) public posts;
    uint256 public postCount;
    uint256 public postingFee;

    event PostCreated(uint256 indexed postId, address indexed author, string content, uint256 timestamp);
    event PostDeleted(uint256 indexed postId, address indexed deletedBy);

    // ─── Interactions Storage ────────────────────────────────
    struct Comment {
        address author;
        string  text;
        uint256 timestamp;
    }

    mapping(uint256 => mapping(address => bool)) public hasLiked;
    mapping(uint256 => Comment[])  private postComments;

    uint256 public constant MAX_COMMENTS_PER_POST = 100;
    uint256 public constant MAX_COMMENT_LENGTH    = 280;

    event PostLiked(uint256 indexed postId, address indexed liker);
    event CommentAdded(uint256 indexed postId, address indexed author, string text, uint256 timestamp);

    // ─── Economics Storage ───────────────────────────────────
    event TipSent(uint256 indexed postId, address indexed tipper, address indexed author, uint256 amount);
    event PostingFeeUpdated(uint256 oldFee, uint256 newFee);
    event Withdrawal(address indexed owner, uint256 amount);

    // ─── Constructor ─────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        postingFee = 0;
    }

    // ═══════════════════════════════════════════════════════════
    //  PROFILES
    // ═══════════════════════════════════════════════════════════

    function registerUser(string calldata _username) external {
        require(!addressToProfile[msg.sender].exists,        "Already registered");
        require(usernameToAddress[_username] == address(0), "Username taken");
        require(bytes(_username).length > 0,                "Empty username");
        require(bytes(_username).length <= 32,              "Username too long");

        addressToProfile[msg.sender] = Profile({ username: _username, exists: true });
        usernameToAddress[_username] = msg.sender;

        emit UserRegistered(msg.sender, _username);
    }

    function getProfile(address _user)
        external view
        returns (string memory username, bool exists)
    {
        Profile storage p = addressToProfile[_user];
        return (p.username, p.exists);
    }

    // ═══════════════════════════════════════════════════════════
    //  POSTS
    // ═══════════════════════════════════════════════════════════

    function createPost(string calldata _content)
        external payable
        onlyRegistered
    {
        require(msg.value >= postingFee,       "Insufficient fee");
        require(bytes(_content).length > 0,    "Empty content");
        require(bytes(_content).length <= 280, "Content too long (max 280 chars)");

        uint256 postId = postCount;

        posts[postId] = Post({
            id:        postId,
            author:    msg.sender,
            content:   _content,
            timestamp: block.timestamp,
            likeCount: 0,
            exists:    true
        });

        postCount++;

        emit PostCreated(postId, msg.sender, _content, block.timestamp);
    }

    function deletePost(uint256 _postId)
        external
        onlyOwner
        postExists(_postId)
    {
        posts[_postId].exists = false;
        emit PostDeleted(_postId, msg.sender);
    }

    function getPost(uint256 _postId)
        external view
        postExists(_postId)
        returns (
            uint256 id,
            address author,
            string memory content,
            uint256 timestamp,
            uint256 likeCount,
            bool    exists
        )
    {
        Post storage p = posts[_postId];
        return (p.id, p.author, p.content, p.timestamp, p.likeCount, p.exists);
    }

    // ═══════════════════════════════════════════════════════════
    //  INTERACTIONS
    // ═══════════════════════════════════════════════════════════

    function likePost(uint256 _postId)
        external
        onlyRegistered
        postExists(_postId)
    {
        require(!hasLiked[_postId][msg.sender], "Already liked this post");

        hasLiked[_postId][msg.sender] = true;
        posts[_postId].likeCount++;

        emit PostLiked(_postId, msg.sender);
    }

    function commentOnPost(uint256 _postId, string calldata _text)
        external
        onlyRegistered
        postExists(_postId)
    {
        require(bytes(_text).length > 0,                   "Empty comment");
        require(bytes(_text).length <= MAX_COMMENT_LENGTH, "Comment too long");
        require(
            postComments[_postId].length < MAX_COMMENTS_PER_POST,
            "Comment limit reached for this post"
        );

        postComments[_postId].push(Comment({
            author:    msg.sender,
            text:      _text,
            timestamp: block.timestamp
        }));

        emit CommentAdded(_postId, msg.sender, _text, block.timestamp);
    }

    function getComments(uint256 _postId)
        external view
        postExists(_postId)
        returns (Comment[] memory)
    {
        return postComments[_postId];
    }

    function getCommentCount(uint256 _postId)
        external view
        postExists(_postId)
        returns (uint256)
    {
        return postComments[_postId].length;
    }

    // ═══════════════════════════════════════════════════════════
    //  ECONOMICS
    // ═══════════════════════════════════════════════════════════

    function tipAuthor(uint256 _postId)
        external payable
        onlyRegistered
        postExists(_postId)
    {
        require(msg.value > 0,                          "Tip must be > 0");
        require(posts[_postId].author != msg.sender,   "Cannot tip yourself");

        address author = posts[_postId].author;

        // checks-effects-interactions pattern
        (bool success, ) = author.call{value: msg.value}("");
        require(success, "Tip transfer failed");

        emit TipSent(_postId, msg.sender, author, msg.value);
    }

    function setPostingFee(uint256 _newFee) external onlyOwner {
        emit PostingFeeUpdated(postingFee, _newFee);
        postingFee = _newFee;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");

        emit Withdrawal(owner, balance);
    }

    // ─── Fallback: reject accidental ETH sends ───────────────
    receive() external payable {
        revert("Use createPost or tipAuthor");
    }
}
