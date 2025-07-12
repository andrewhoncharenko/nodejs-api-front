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
    fetch('http://localhost:8080/user/status')
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
  }, []
);

const loadPosts = direction => {
    if (direction) {
      setState(prevState => {
        return { ...prevState, postsLoading: true, posts: [] };
      });
    }
    let page = state.postPage;
    if (direction === 'next') {
      page++;
      setState(prevState => {
        return{ ...prevState, postPage: page };
      });
    }
    if (direction === 'previous') {
      page--;
      setState(prevState => {
        return { ...prevState, postPage: page };
      });
    }
    fetch('http://localhost:8080/feed/posts')
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
            posts: resData.posts,
            totalPosts: resData.totalItems,
            postsLoading: false
          };
        });
      })
      .catch(catchError);
  };

const statusUpdateHandler = event => {
    event.preventDefault();
    fetch('URL')
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
      return { ...prevState, isEditing: true }
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
    setState(prevState => {
      return { ...prevState, editLoading: true };
    });
    // Set up data (with image!)
    let url = 'http://localhost:8080/feed/post';
    let method = "POST";
    if (state.editPost) {
      url = 'URL';
    }

    fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({title: postData.title, content: postData.content})
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Creating or editing a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        const post = {
          _id: resData.post._id,
          title: resData.post.title,
          content: resData.post.content,
          creator: resData.post.creator,
          createdAt: resData.post.createdAt
        };
        setState(prevState => {
          let updatedPosts = [...prevState.posts];
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              p => p._id === prevState.editPost._id
            );
            updatedPosts[postIndex] = post;
          } else if (prevState.posts.length < 2) {
            updatedPosts = prevState.posts.concat(post);
          }
          return {
            ...prevState,
            posts: updatedPosts,
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
    fetch('URL')
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Deleting a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
        setState(prevState => {
          const updatedPosts = prevState.posts.filter(p => p._id !== postId);
          return {...prevState, posts: updatedPosts, postsLoading: false };
        });
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
      return { error: null };
    });
  };

const catchError = error => {
    setState(prevState => {
      return {...prevState, error: error };
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
