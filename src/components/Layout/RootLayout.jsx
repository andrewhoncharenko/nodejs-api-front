import Layout from "./Layout";
import Toolbar from "../Toolbar/Toolbar";
import MainNavigation from "../Navigation/MainNavigation/MainNavigation";
import MobileNavigation from "../Navigation/MobileNavigation/MobileNavigation";
import { Outlet } from "react-router-dom";

const RootLayout = (props) => {
    return <>
    {props.showBackdrop && (
        <Backdrop onClick={props.backdropClickHandler} />
    )}
        <Layout
          header={
            <Toolbar>
              <MainNavigation
                onOpenMobileNav={props.mobileNavHandler}
                onLogout={props.logoutHandler}
                isAuth={props.isAuth}
              />
            </Toolbar>
          }
          mobileNav={
            <MobileNavigation
              open={props.showMobileNav}
              mobile
              onChooseItem={props.mobileNavHandler}
              onLogout={props.logoutHandler}
              isAuth={props.isAuth}
            />
          }
        >
            <Outlet />
        </Layout>
    </>
};

export default RootLayout;