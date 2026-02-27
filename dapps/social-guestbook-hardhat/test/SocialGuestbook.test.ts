import { expect } from "chai";
import { ethers } from "hardhat";
import { SocialGuestbook } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SocialGuestbook", function () {
  let contract: SocialGuestbook;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SocialGuestbook");
    contract = (await Factory.deploy()) as SocialGuestbook;
    await contract.waitForDeployment();
  });

  // ─── Deployment ────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("sets deployer as owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("initialises postCount to 0", async function () {
      expect(await contract.postCount()).to.equal(0n);
    });

    it("initialises postingFee to 0", async function () {
      expect(await contract.postingFee()).to.equal(0n);
    });

    it("exposes correct MAX_COMMENTS_PER_POST", async function () {
      expect(await contract.MAX_COMMENTS_PER_POST()).to.equal(50n);
    });

    it("exposes correct MAX_COMMENT_LENGTH", async function () {
      expect(await contract.MAX_COMMENT_LENGTH()).to.equal(280n);
    });
  });

  // ─── registerUser ──────────────────────────────────────────────────────────

  describe("registerUser", function () {
    it("registers a new user and emits UserRegistered", async function () {
      await expect(contract.connect(alice).registerUser("alice"))
        .to.emit(contract, "UserRegistered")
        .withArgs(alice.address, "alice");

      const [username, exists] = await contract.getProfile(alice.address);
      expect(username).to.equal("alice");
      expect(exists).to.be.true;
    });

    it("maps username → address", async function () {
      await contract.connect(alice).registerUser("alice");
      expect(await contract.usernameToAddress("alice")).to.equal(alice.address);
    });

    it("reverts if already registered", async function () {
      await contract.connect(alice).registerUser("alice");
      await expect(
        contract.connect(alice).registerUser("alice2")
      ).to.be.revertedWith("Already registered");
    });

    it("reverts if username is empty", async function () {
      await expect(
        contract.connect(alice).registerUser("")
      ).to.be.revertedWith("Username cannot be empty");
    });

    it("reverts if username is already taken", async function () {
      await contract.connect(alice).registerUser("alice");
      await expect(
        contract.connect(bob).registerUser("alice")
      ).to.be.revertedWith("Username taken");
    });
  });

  // ─── createPost ────────────────────────────────────────────────────────────

  describe("createPost", function () {
    beforeEach(async function () {
      await contract.connect(alice).registerUser("alice");
    });

    it("creates a post and emits PostCreated", async function () {
      await expect(contract.connect(alice).createPost("Hello world!"))
        .to.emit(contract, "PostCreated")
        .withArgs(1n, alice.address, "Hello world!", await latestTimestamp());

      expect(await contract.postCount()).to.equal(1n);
    });

    it("getPost returns correct fields", async function () {
      await contract.connect(alice).createPost("MIDL is cool");
      const [id, author, content, , likeCount, exists] = await contract.getPost(1n);
      expect(id).to.equal(1n);
      expect(author).to.equal(alice.address);
      expect(content).to.equal("MIDL is cool");
      expect(likeCount).to.equal(0n);
      expect(exists).to.be.true;
    });

    it("reverts if caller is unregistered", async function () {
      await expect(
        contract.connect(bob).createPost("unregistered post")
      ).to.be.revertedWith("Must be registered");
    });

    it("reverts if content is empty", async function () {
      await expect(
        contract.connect(alice).createPost("")
      ).to.be.revertedWith("Content cannot be empty");
    });

    it("requires fee when postingFee is set", async function () {
      const fee = ethers.parseEther("0.001");
      await contract.connect(owner).setPostingFee(fee);
      await contract.connect(bob).registerUser("bob");

      await expect(
        contract.connect(bob).createPost("cheap post", { value: 0n })
      ).to.be.revertedWith("Insufficient fee");

      await expect(
        contract.connect(bob).createPost("paid post", { value: fee })
      ).to.not.be.reverted;
    });
  });

  // ─── likePost ──────────────────────────────────────────────────────────────

  describe("likePost", function () {
    beforeEach(async function () {
      await contract.connect(alice).registerUser("alice");
      await contract.connect(bob).registerUser("bob");
      await contract.connect(alice).createPost("like this!");
    });

    it("likes a post and emits PostLiked", async function () {
      await expect(contract.connect(bob).likePost(1n))
        .to.emit(contract, "PostLiked")
        .withArgs(1n, bob.address);

      const [, , , , likeCount] = await contract.getPost(1n);
      expect(likeCount).to.equal(1n);
    });

    it("tracks hasLiked per user", async function () {
      await contract.connect(bob).likePost(1n);
      expect(await contract.hasLiked(1n, bob.address)).to.be.true;
      expect(await contract.hasLiked(1n, alice.address)).to.be.false;
    });

    it("reverts if post does not exist", async function () {
      await expect(
        contract.connect(bob).likePost(999n)
      ).to.be.revertedWith("Post does not exist");
    });

    it("reverts if already liked", async function () {
      await contract.connect(bob).likePost(1n);
      await expect(
        contract.connect(bob).likePost(1n)
      ).to.be.revertedWith("Already liked");
    });

    it("reverts if author tries to like own post", async function () {
      await expect(
        contract.connect(alice).likePost(1n)
      ).to.be.revertedWith("Cannot like own post");
    });

    it("reverts if caller is unregistered", async function () {
      await expect(
        contract.connect(charlie).likePost(1n)
      ).to.be.revertedWith("Must be registered");
    });
  });

  // ─── commentOnPost ─────────────────────────────────────────────────────────

  describe("commentOnPost", function () {
    beforeEach(async function () {
      await contract.connect(alice).registerUser("alice");
      await contract.connect(bob).registerUser("bob");
      await contract.connect(alice).createPost("comment on me");
    });

    it("adds a comment and emits CommentAdded", async function () {
      await expect(contract.connect(bob).commentOnPost(1n, "Nice post!"))
        .to.emit(contract, "CommentAdded")
        .withArgs(1n, bob.address, "Nice post!", await latestTimestamp());

      expect(await contract.getCommentCount(1n)).to.equal(1n);
    });

    it("getComments returns comment data", async function () {
      await contract.connect(bob).commentOnPost(1n, "LGTM");
      const comments = await contract.getComments(1n);
      expect(comments.length).to.equal(1);
      expect(comments[0].author).to.equal(bob.address);
      expect(comments[0].text).to.equal("LGTM");
    });

    it("allows author to comment on own post", async function () {
      await expect(
        contract.connect(alice).commentOnPost(1n, "self-reply")
      ).to.not.be.reverted;
    });

    it("reverts if post does not exist", async function () {
      await expect(
        contract.connect(bob).commentOnPost(999n, "ghost")
      ).to.be.revertedWith("Post does not exist");
    });

    it("reverts if comment is empty", async function () {
      await expect(
        contract.connect(bob).commentOnPost(1n, "")
      ).to.be.revertedWith("Comment cannot be empty");
    });

    it("reverts if comment exceeds MAX_COMMENT_LENGTH", async function () {
      const tooLong = "x".repeat(281);
      await expect(
        contract.connect(bob).commentOnPost(1n, tooLong)
      ).to.be.revertedWith("Comment too long");
    });

    it("reverts if caller is unregistered", async function () {
      await expect(
        contract.connect(charlie).commentOnPost(1n, "lurker comment")
      ).to.be.revertedWith("Must be registered");
    });
  });

  // ─── tipAuthor ─────────────────────────────────────────────────────────────

  describe("tipAuthor", function () {
    beforeEach(async function () {
      await contract.connect(alice).registerUser("alice");
      await contract.connect(bob).registerUser("bob");
      await contract.connect(alice).createPost("tip me!");
    });

    it("sends tip to post author and emits TipSent", async function () {
      const tip = ethers.parseEther("0.01");
      const aliceBefore = await ethers.provider.getBalance(alice.address);

      await expect(
        contract.connect(bob).tipAuthor(1n, { value: tip })
      )
        .to.emit(contract, "TipSent")
        .withArgs(1n, bob.address, alice.address, tip);

      const aliceAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceAfter - aliceBefore).to.equal(tip);
    });

    it("reverts if tip amount is 0", async function () {
      await expect(
        contract.connect(bob).tipAuthor(1n, { value: 0n })
      ).to.be.revertedWith("Tip must be > 0");
    });

    it("reverts if post does not exist", async function () {
      await expect(
        contract.connect(bob).tipAuthor(999n, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Post does not exist");
    });

    it("reverts if author tips themselves", async function () {
      await expect(
        contract.connect(alice).tipAuthor(1n, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Cannot tip yourself");
    });

    it("reverts if caller is unregistered", async function () {
      await expect(
        contract.connect(charlie).tipAuthor(1n, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Must be registered");
    });
  });

  // ─── deletePost ────────────────────────────────────────────────────────────

  describe("deletePost", function () {
    beforeEach(async function () {
      await contract.connect(alice).registerUser("alice");
      await contract.connect(bob).registerUser("bob");
      await contract.connect(alice).createPost("delete me");
    });

    it("author can delete own post and emits PostDeleted", async function () {
      await expect(contract.connect(alice).deletePost(1n))
        .to.emit(contract, "PostDeleted")
        .withArgs(1n, alice.address);

      const [, , , , , exists] = await contract.getPost(1n);
      expect(exists).to.be.false;
    });

    it("owner can delete any post", async function () {
      await contract.connect(owner).registerUser("admin");
      await expect(contract.connect(owner).deletePost(1n))
        .to.emit(contract, "PostDeleted")
        .withArgs(1n, owner.address);
    });

    it("reverts if non-author non-owner tries to delete", async function () {
      await expect(
        contract.connect(bob).deletePost(1n)
      ).to.be.revertedWith("Not authorized");
    });

    it("reverts if post does not exist", async function () {
      await expect(
        contract.connect(alice).deletePost(999n)
      ).to.be.revertedWith("Post does not exist");
    });
  });

  // ─── setPostingFee (owner-only) ────────────────────────────────────────────

  describe("setPostingFee", function () {
    it("owner can set posting fee and emits PostingFeeUpdated", async function () {
      const newFee = ethers.parseEther("0.005");
      await expect(contract.connect(owner).setPostingFee(newFee))
        .to.emit(contract, "PostingFeeUpdated")
        .withArgs(0n, newFee);

      expect(await contract.postingFee()).to.equal(newFee);
    });

    it("reverts if non-owner calls setPostingFee", async function () {
      await expect(
        contract.connect(alice).setPostingFee(ethers.parseEther("0.1"))
      ).to.be.revertedWith("Not owner");
    });
  });

  // ─── withdraw (owner-only) ─────────────────────────────────────────────────

  describe("withdraw", function () {
    beforeEach(async function () {
      await contract.connect(alice).registerUser("alice");
      const fee = ethers.parseEther("0.01");
      await contract.connect(owner).setPostingFee(fee);
      await contract.connect(bob).registerUser("bob");
      await contract.connect(bob).createPost("paid post", { value: fee });
    });

    it("owner can withdraw collected fees and emits Withdrawal", async function () {
      const balance = await ethers.provider.getBalance(await contract.getAddress());
      expect(balance).to.be.gt(0n);

      await expect(contract.connect(owner).withdraw())
        .to.emit(contract, "Withdrawal")
        .withArgs(owner.address, balance);

      expect(
        await ethers.provider.getBalance(await contract.getAddress())
      ).to.equal(0n);
    });

    it("reverts if non-owner calls withdraw", async function () {
      await expect(
        contract.connect(alice).withdraw()
      ).to.be.revertedWith("Not owner");
    });

    it("reverts if contract balance is 0", async function () {
      await contract.connect(owner).withdraw();
      await expect(
        contract.connect(owner).withdraw()
      ).to.be.revertedWith("Nothing to withdraw");
    });
  });

  // ─── receive fallback ──────────────────────────────────────────────────────

  describe("receive()", function () {
    it("accepts plain ETH transfers", async function () {
      await owner.sendTransaction({
        to: await contract.getAddress(),
        value: ethers.parseEther("0.1"),
      });
      const balance = await ethers.provider.getBalance(await contract.getAddress());
      expect(balance).to.equal(ethers.parseEther("0.1"));
    });
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

async function latestTimestamp(): Promise<bigint> {
  const block = await ethers.provider.getBlock("latest");
  return BigInt(block!.timestamp + 1);
}
