import {useState, useEffect} from 'react';
import { useParams } from 'react-router';

import Image from '../../../components/Image/Image';
import './SinglePost.css';


const SinglePost = (props) => {
  const params = useParams();
  const [state, setState] = useState({
    title: '',
    author: '',
    date: '',
    image: '',
    content: ''
  });

useEffect(() => {
    const postId = params.postId;
    
    fetch('http://localhost:8080/feed/post/' + postId)
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch status');
        }
        return res.json();
      })
      .then(resData => {
        setState({
          title: resData.post.title,
          author: resData.post.creator.name,
          date: new Date(resData.post.createdAt).toLocaleDateString('en-US'),
          image: "http://localhost:8080/" + resData.post.imageUrl,
          content: resData.post.content
        });
      })
      .catch(err => {
        console.log(err);
      });
  }, []);

    return (
      <section className="single-post">
        <h1>{state.title}</h1>
        <h2>
          Created by {state.author} on {state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={state.image} />
        </div>
        <p>{state.content}</p>
      </section>
    );
}

export default SinglePost;
