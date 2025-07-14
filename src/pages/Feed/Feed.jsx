import { useEffect, useState } from 'react';
import openSocket from "socket.io-client";

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
    fetch('http://localhost:8080/auth/status', {
      headers: {
        Authorization: "Bearer " + props.token
      }
    })
    .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch user status.');
        }
        return res.json();
      })
    .then(resData => {
        setState(prevState => {
          return { ...prevState, status: resData.status };
        });
      })
    .catch(catchError);
    loadPosts();
    
    const socket = openSocket("http://localhost:8080");
    socket.on("posts", data => {
      if(data.action === "create") {
        addPost(data.post);
      }
      else if(data.action === "update") {
        updatePost(data.post);
      }
      else if(data.action === "delete") {
        loadPosts();
      }
    });
  }, []
);

const addPost = post => {
  setState(prevState => {
    const updatedPosts = [...prevState.posts];
    if(prevState.postPage === 1) {
      if(prevState.posts.length >= 2) {
        updatedPosts.pop();
      }
      updatedPosts.unshift(post);
    }
    return {...prevState, posts: updatedPosts, totalPosts: prevState.totalPosts + 1};
  });
};
const updatePost = post => {
  setState(prevState => {
    const updatedPosts = [...prevState.posts];
    const updatedPostIndex = updatedPosts.findIndex(p => p._id === post._id);
    if(updatedPostIndex > -1) {
      updatedPosts[updatedPostIndex] = post;
    }
    return {...prevState, posts: updatedPosts};
  });
};
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
    fetch('http://localhost:8080/feed/posts?page=' + page, {
      headers: {
        Authorization: "Bearer " + props.token
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch posts.');
        }
        return res.json();
      })
      .then(resData => {
        setState(prevState => {
          return {
            ...prevState,
            posts: resData.posts.map(post => {
              return {
                ...post,
                imagePath: post.imageUrl
              };
            }),
            totalPosts: resData.totalItems,
            postsLoading: false
          };
        });
      })
      .catch(catchError);
  };

const statusUpdateHandler = event => {
    event.preventDefault();
    fetch('http://localhost:8080/auth/status', {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: state.status
      })
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
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
    let url = 'http://localhost:8080/feed/post';
    let method = "POST";
    const formData = new FormData();
    
    setState(prevState => {
      return { ...prevState, editLoading: true };
    });

    formData.append("title", postData.title);
    formData.append("image", postData.image);
    formData.append("content", postData.content);
    if (state.editPost) {
      url = 'http://localhost:8080/feed/post/' + state.editPost._id;
      method = "PUT";
    }

    fetch(url, {
      method: method,
      headers: {
        Authorization: "Bearer " + props.token
      },
      body: formData
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Creating or editing a post failed!');
        }
        return res.json();
      })
      .then(() => {
        setState(prevState => {
          return {
            ...prevState,
            isEditing: false,
            editPost: null,
            editLoading: false
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
    setState(prevState => {
      return {...prevState, postsLoading: true };
    });
    fetch('http://localhost:8080/feed/post/' + postId, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + props.token
        }
      }
    )
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Deleting a post failed!');
        }
        return res.json();
      })
      .then(() => {
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
