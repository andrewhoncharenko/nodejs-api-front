import { useEffect, useState } from 'react';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

const Feed = props => {
  const [ state, setState ] = useState({
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  });
 useEffect(() => {
    const graphqlQuery = { query: `{
      user {
        status
      }
    }`};
    fetch('http://localhost:8080/graphql', {
      method: "POST",
      headers: {
        Authorization: "Bearer " + props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
    .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch user status.');
        }
        return res.json();
      })
    .then(resData => {
        setState(prevState => {
          return { ...prevState, status: resData.data.user.status };
        });
      })
    .catch(catchError);
    loadPosts();
  }, []
);

const loadPosts = direction => {
    if(direction) {
      setState(prevState => {
        return { ...prevState, postsLoading: true, posts: [] };
      });
    }
    let page = state.postPage;
    if (direction === 'next') {
      page++;
      setState(prevState => {
        return { ...prevState, postPage: page };
      });
    }
    if (direction === 'previous') {
      page--;
      setState(prevState => {
        return { ...prevState, postPage: page };
      });
    }

    const graphqlQuery = { query: `
    query FetchPosts($page: Int) {
      posts(page: $page) {
        posts {
          _id,
          title,
          content,
          imageUrl,
          creator {
            name
          },
          createdAt
        },
        totalPosts
      }
    }
    `,
    variables: {
      page: page
    }};

    fetch('http://localhost:8080/graphql', {
      method: "POST",
      headers: {
        Authorization: "Bearer " + props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
    .then(res => {
      return res.json();
    })
    .then(resData => {
      if(resData.errors) {
        throw new Error("Fetching posts failed");
      }
      setState(prevState => {
        return {
            ...prevState,
            posts: resData.data.posts.posts,
            totalPosts: resData.data.posts.totalPosts,
            postsLoading: false
          };
        });
      })
      .catch(catchError);
  };

const statusUpdateHandler = event => {
    const graphqlQuery = { query: `
      mutation UpdateUserStatus($userStatus: String!) {
        updateStatus(status: "$userStatus")
        {
          status
        }
      }  
    `,
      variables: {
        userStatus: state.status
      }
  };
    event.preventDefault();
    fetch('http://localhost:8080/graphql', {
      method: "POST",
      headers: {
        Authorization: "Bearer " + props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if(resData.errors) {
          throw new Error("Status update failed");
        }
      })
      .catch(catchError);
  };

const newPostHandler = () => {
    setState(prevState => {
      return { ...prevState, isEditing: true };
    });
  };

const startEditPostHandler = postId => {
    setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        ...prevState, 
        isEditing: true,
        editPost: loadedPost
      };
    });
};
const cancelEditHandler = () => {
    setState(prevState => {
      return {...prevState, isEditing: false, editPost: null };
    });
};
const finishEditHandler = postData => {
    const formData = new FormData();

    formData.append("image", postData.image);
    if(state.editPost) {
      formData.append("oldPath", state.editPost.imageUrl);
    }
    setState(prevState => {
      return { ...prevState, editLoading: true };
    });
    fetch("http://localhost:8080/post-image", {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + props.token
      },
      body: formData
    })
    .then(res => res.json())
    .then(filelResData => {
      const imageUrl = filelResData.filePath || "undefined";
      let graphqlQuery = { query:`
        mutation CreateNewPost($title: String!, $content: String!, $imageUrl: String!) {
          createPost(postInput: {title: $title, content: $content, imageUrl: $imageUrl }) {
            _id,
            title,
            content,
            imageUrl,
            creator {
              name
            },
            createdAt
          }
        }`,
      variables: {
        title: postData.title,
        content: postData.content,
        imageUrl: imageUrl
      }};
      if(state.editPost) {
        graphqlQuery = { query:`
        mutation UpdateExistingPost($id: ID!, $title: String!, $content: String!, $imageUrl: String!) {
          updatePost(id: $id, postInput: {title: $title, content: $content, imageUrl: $imageUrl }) {
            _id,
            title,
            content,
            imageUrl,
            creator {
              name
            },
            createdAt
          }
        }`,
      variables:{
        id: state.editPost._id,
        title: postData.title,
        content: postData.content,
        imageUrl: imageUrl
      }};
      }

      return fetch("http://localhost:8080/graphql", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + props.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(graphqlQuery)
      })
    })
    .then(res => {
      return res.json();
    })
      .then(resData => {
        if(resData.errors && resData.errors[0].status === 422) {
          throw new Error("Validation failed. Make sure the email address isn`t used yet.");
        }
        if(resData.errors) {
          throw new Error("User login failed.");
        }

        let resDataField = "createPost";
        if(state.editPost) {
          resDataField = "updatePost";
        }
        const post = {
          _id: resData.data[resDataField]._id,
          title: resData.data[resDataField].title,
          content: resData.data[resDataField].content,
          creator: resData.data[resDataField].creator,
          createdAt: resData.data[resDataField].createdAt
        };
        setState(prevState => {
          let updatedPosts = [...prevState.posts];
          let updatedTotalPosts = prevState.totalPosts;
          if(prevState.editPost) {
            const postIndex = prevState.posts.findIndex(p => p._id === prevState.editPost._id);
            updatedPosts[postIndex] = post;
          }
          else {
            updatedTotalPosts++;
            if(prevState.posts.length >= 2) {
              updatedPosts.pop();
            }
            updatedPosts.unshift(post);
          }
          return {
            posts: updatedPosts,
            isEditing: false,
            editPost: null,
            editLoading: false,
            totalPosts: updatedTotalPosts
          };
        });
      })
      .catch(err => {
        console.log(err);
        setState(prevState => {
          return {
            ...prevState,
            isEditing: false,
            editPost: null,
            editLoading: false,
            error: err
          }
        });
      });
  };

const statusInputChangeHandler = (input, value) => {
    setState(prevState => {
      return {...prevState, status: value };
    });
  };

const deletePostHandler = postId => {
    const graphqlQuery = { query: `
      mutation DeletePost($postId: ID!) {
        deletePost(id: "$postId")
      }
    `,
    variables: {
      postId: postId
    }};

    setState(prevState => {
      return {...prevState, postsLoading: true };
    });
    fetch('http://localhost:8080/graphql', {
        method: "POST",
        headers: {
          Authorization: "Bearer " + props.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(graphqlQuery)
      }
    )
      .then(res => {
        return res.json();
      })
      .then((resData) => {
        if(resData.errors) {
          throw new Error('Deleting the post failed!');
        }
        loadPosts();
      })
      .catch(err => {
        console.log(err);
        setState(prevState => {
          return {...prevState, postsLoading: false };
        });
      });
  };

const errorHandler = () => {
    setState(prevState => {
      return {...prevState, error: null};
    });
  };

const catchError = error => {
    setState(prevState => {
      return {...prevState, error: error};
    });
};
    return (
      <>
        <ErrorHandler error={state.error} onHandle={errorHandler} />
        <FeedEdit
          editing={state.isEditing}
          selectedPost={state.editPost}
          loading={state.editLoading}
          onCancelEdit={cancelEditHandler}
          onFinishEdit={finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={statusInputChangeHandler}
              value={state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {state.posts.length <= 0 && !state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!state.postsLoading && (    
            <Paginator
              onPrevious={() => loadPosts('previous')}
              onNext={() => loadPosts('next')}
              lastPage={Math.ceil(state.totalPosts / 2)}
              currentPage={state.postPage}
            >
              {state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={() => startEditPostHandler(post._id)}
                  onDelete={() => deletePostHandler(post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </>
    );
}

export default Feed;
