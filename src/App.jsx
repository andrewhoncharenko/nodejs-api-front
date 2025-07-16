import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import RootLayout from './components/Layout/RootLayout';
import ErrorHandler from './components/ErrorHandler/ErrorHandler';
import FeedPage from './pages/Feed/Feed';
import SinglePostPage from './pages/Feed/SinglePost/SinglePost';
import LoginPage from './pages/Auth/Login';
import SignupPage from './pages/Auth/Signup';

import './App.css'

function App(props) {
  const [state, setState] = useState({
    showBackdrop: false,
    showMobileNav: false,
    isAuth: false,
    token: null,
    userId: null,
    authLoading: false,
    error: null
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const expiryDate = localStorage.getItem('expiryDate');
    if (!token || !expiryDate) {
      return;
    }
    if (new Date(expiryDate) <= new Date()) {
      logoutHandler();
      return;
    }
    const userId = localStorage.getItem('userId');
    const remainingMilliseconds =
      new Date(expiryDate).getTime() - new Date().getTime();
    setState({ isAuth: true, token: token, userId: userId });
    setAutoLogout(remainingMilliseconds);
    
  }, []);

  const mobileNavHandler = isOpen => {
    setState(prevState => {
      return { ...prevState, showMobileNav: isOpen, showBackdrop: isOpen };
    });
  };

  const backdropClickHandler = () => {
    setState(prevState => {
      return { ...prevtate, showBackdrop: false, showMobileNav: false, error: null };
    });
  };

  const logoutHandler = () => {
    setState(prevState => {
      return {...prevState, isAuth: false, token: null };
    });
    localStorage.removeItem('token');
    localStorage.removeItem('expiryDate');
    localStorage.removeItem('userId');
  };

  const loginHandler = (event, authData) => {
    event.preventDefault();
    setState({ ...state, authLoading: true });

    const graphqlQuery = { query: `
      query LoginUser($email: String!, $password: String!) {
      login(email: "$email", password: "$password") {
        token,
        userId
      }
    }`,
      variables: {
        email: authData.email,
        psssword: authData.password
      }
  };

    fetch('http://localhost:8080/graphql', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
    .then(res => {
      return res.json();
    })
      .then(resData => {
        if(resData.errors && resData.errors[0].status === 401) {
          throw new Error(resData.errors[0].message);
        }
        setState(prevState => {
          return {
            ...prevState,
            isAuth: true,
            token: resData.data.login.token,
            authLoading: false,
            userId: resData.data.login.userId
          };
        });
        localStorage.setItem('token', resData.data.login.token);
        localStorage.setItem('userId', resData.data.login.userId);
        const remainingMilliseconds = 60 * 60 * 1000;
        const expiryDate = new Date(
          new Date().getTime() + remainingMilliseconds
        );
        localStorage.setItem('expiryDate', expiryDate.toISOString());
        setAutoLogout(remainingMilliseconds);
      })
      .catch(err => {
        console.log(err);
        setState(prevState => {
          return {
            ...prevState,
            isAuth: false,
            authLoading: false,
            error: err
          };
        });
      });
  };

  const signupHandler = (event, authData) => {
    event.preventDefault();
    setState(prevState => {
      return{ ...prevState, authLoading: false };
    });

    const graphqlQuery = { query: `
      mutation CreateNewUser($email: String!, $name: String!, $password: String!,,) {
        createUser(userInput: {
          email: "$email",
          name: "$name",
          password: "$password" })
          {
            _id,
            email
          }
      }
    `,
    variables: {
      email: authData.signupForm.email.value,
      name: authData.signupForm.name.value,
      password: authData.signupForm.password.value
    }
  };
    fetch('http://localhost:8080/graphql', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if(resData.errors && resData.errors[0].status === 422) {
          throw new Error("Validation failed. Make sure the email address isn`t used yet.");
        }
        if(resData.errors) {
          throw new Error("User creation failed.");
        }
        setState(prevState => {
          return{ ...prevState, isAuth: false, authLoading: false }
        });
        props.history.replace('/');
      })
      .catch(err => {
        console.log(err);
        setState(prevState => {
          return {
            ...prevState,
            isAuth: false,
            authLoading: false,
            error: err
          };
        });
      });
  };

  const setAutoLogout = milliseconds => {
    setTimeout(() => {
      logoutHandler();
    }, milliseconds);
  };

  const errorHandler = () => {
    setState(prevState => {
      return { ...prevState, error: null };
    });
  };
  let router = createBrowserRouter([
    {
      path: "/",
      element: <RootLayout
        showBackdrop = {state.showBackdrop}
        showMobileNav = {state.showMobileNav}
        isAuth = {state.isAuth}
        backdropClickHandler = {backdropClickHandler}
        mobileNavHandler = {mobileNavHandler}
        logoutHandler = {logoutHandler} />,
      errorElement: <ErrorHandler error = {state.error} onHandle = {errorHandler} />,
      children: [
        {
          path: "/",
          element: <LoginPage
              {...props}
              onLogin={loginHandler}
              loading={state.authLoading}
            />
        },
        {
          path: "/signup",
          element: <SignupPage
              {...props}
              onSignup={signupHandler}
              loading={state.authLoading}
            />
        }
      ]
    }
  ]);
  if(state.isAuth) {
      router = createBrowserRouter([
        {
          path: "/",
          element: <RootLayout
            showBackdrop = {state.showBackdrop}
            isAuth = {state.isAuth}
            logoutHandler={logoutHandler}
            backdropClickHandler = {backdropClickHandler}
          />,
          errorElement: <ErrorHandler error={state.error} onHandle={errorHandler} />,
          children: [
            {
              path: "/",
              element: <FeedPage userId={state.userId} token={state.token} />
            },
            {
              path: "/:postId",
              element: <SinglePostPage
                  {...props}
                  userId={state.userId}
                  token={state.token}
                />
            }
          ]
    }]);
  }
  return <RouterProvider router={router} />
}

export default App
