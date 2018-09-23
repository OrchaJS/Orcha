import React, { Fragment } from 'react';

import CardHeader from './CardHeader';
import { MyContext } from '../../../../provider/MyProvider';

const Card = ({ title, render }) => (
  <div className="card">
    <MyContext.Consumer>
      {({ state: { lambdaDetails, secondaryActiveTab }, handleClickSecondaryTab }) => (
        <Fragment>
          <CardHeader
            title={title}
            secondaryActiveTab={secondaryActiveTab}
            handleClickSecondaryTab={handleClickSecondaryTab}
          />
          <div className={`${title === secondaryActiveTab ? 'card__body--active' : 'card__body'}`}>
            {render(lambdaDetails)}
          </div>
        </Fragment>
      )}
    </MyContext.Consumer>
  </div>
);

export default Card;
