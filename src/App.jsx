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
  }, [])

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
    fetch('http://localhost:8080/auth/login', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: authData.email,
        password: authData.password
      })
    })
      .then(res => {
        if (res.status === 422) {
          throw new Error('Validation failed.');
        }
        if (res.status !== 200 && res.status !== 201) {
          console.log('Error!');
          throw new Error('Could not authenticate you!');
        }
        return res.json();
      })
      .then(resData => {
        setState(prevState => {
          return {
            ...prevState,
            isAuth: true,
            token: resData.token,
            authLoading: false,
            userId: resData.userId
          };
        });
        localStorage.setItem('token', resData.token);
        localStorage.setItem('userId', resData.userId);
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
      return{ ...prevState, authLoading: true };
    });
    fetch('http://localhost:8080/auth/signup', {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: authData.signupForm.email.value,
        password: authData.signupForm.password.value,
        name: authData.signupForm.name.value
      })
    })
      .then(res => {
        if (res.status === 422) {
          throw new Error(
            "Validation failed. Make sure the email address isn't used yet!"
          );
        }
        if (res.status !== 200 && res.status !== 201) {
          console.log('Error!');
          throw new Error('Creating a user failed!');
        }
        return res.json();
      })
      .then(resData => {
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
