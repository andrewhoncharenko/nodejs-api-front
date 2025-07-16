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
    const graphqlQuery = { query: `{
      post(id: "${postId}")
      {
        title,
        content,
        imageUrl,
        creator {
          name
        },
        createdAt
      }
    }`};

    fetch("http://localhost:8080/graphql", {
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
          throw new Error("Fetching post failed");
        }
        setState({
          title: resData.data.post.title,
          author: resData.data.post.creator.name,
          date: new Date(resData.data.post.createdAt).toLocaleDateString('en-US'),
          image: "http://localhost:8080/" + resData.data.post.imageUrl,
          content: resData.data.post.content
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
