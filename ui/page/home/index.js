import { connect } from 'react-redux';
import * as SETTINGS from 'constants/settings';
import { doOpenModal } from 'redux/actions/app';
import { doFetchActiveLivestreams } from 'redux/actions/livestream';
import { selectAdBlockerFound } from 'redux/selectors/app';
import { selectActiveLivestreams, selectFetchingActiveLivestreams } from 'redux/selectors/livestream';
import { selectFollowedTags } from 'redux/selectors/tags';
import { selectHasOdyseeMembership, selectHomepageFetched, selectUserVerifiedEmail } from 'redux/selectors/user';
import { selectSubscriptions } from 'redux/selectors/subscriptions';
import { selectShowMatureContent, selectHomepageData, selectClientSetting } from 'redux/selectors/settings';

import HomePage from './view';

const select = (state) => ({
  followedTags: selectFollowedTags(state),
  subscribedChannels: selectSubscriptions(state),
  authenticated: selectUserVerifiedEmail(state),
  showNsfw: selectShowMatureContent(state),
  homepageData: selectHomepageData(state),
  homepageFetched: selectHomepageFetched(state),
  activeLivestreams: selectActiveLivestreams(state),
  fetchingActiveLivestreams: selectFetchingActiveLivestreams(state),
  hideScheduledLivestreams: selectClientSetting(state, SETTINGS.HIDE_SCHEDULED_LIVESTREAMS),
  adBlockerFound: selectAdBlockerFound(state),
  homepageOrder: selectClientSetting(state, SETTINGS.HOMEPAGE_ORDER),
  hasMembership: selectHasOdyseeMembership(state),
});

const perform = (dispatch) => ({
  doFetchActiveLivestreams: () => dispatch(doFetchActiveLivestreams()),
  doOpenModal: (modal, props) => dispatch(doOpenModal(modal, props)),
});

export default connect(select, perform)(HomePage);
